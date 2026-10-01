import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthUser } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateQuote as generateDriverQuote } from '@/lib/pricing/quote';
import { getQuoteForVehicle } from '@/lib/carhire/quote';
   import { sendEmail } from '@/lib/email/resend';

const CreateTransactionSchema = z.object({
  customer_user_id: z.string().uuid(),
  booking_type: z.enum(['driver', 'car_hire', 'permanent_placement']),
  
  // For driver bookings
  driver_id: z.string().uuid().optional(),
  engagement_type: z.enum(['hourly', 'full_day']).optional(),
  vehicle_class: z.enum(['sedan', 'suv', 'executive', 'van', 'pickup']).optional(),
  duration_hours: z.number().min(1).max(24).optional(),
  
  // For car hire bookings
  vehicle_id: z.string().uuid().optional(),
  rental_days: z.number().min(1).max(365).optional(),
  
  // For permanent placements
  driver_id_placement: z.string().uuid().optional(),
  monthly_salary: z.number().min(0).optional(),
  placement_start_date: z.string().optional(),
  placement_duration_months: z.number().min(1).optional(),
  placement_role: z.string().optional(),
  
  // Common
  starts_at: z.string().datetime().optional(),
  base_price: z.number().min(0),
  discount_percent: z.number().min(0).max(50).optional(),
  discount_reason: z.string().optional(),
});

export async function POST(req: Request) {
  try {
  const user = await getAuthUser();
if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

const isSuper = user.roles.includes('super_admin');
const canSupport = user.roles.includes('admin_support') || isSuper;
if (!canSupport) {
  return NextResponse.json({ error: 'forbidden' }, { status: 403 });
}

    const body = await req.json();
    const data = CreateTransactionSchema.parse(body);

    const A = await createServiceRoleClient();
    const now = new Date().toISOString();

    // ---- Fetch customer ----
    const { data: customer, error: customerErr } = await A
      .from('users')
      .select('id, email, phone, full_name')
      .eq('id', data.customer_user_id)
      .single();

    if (customerErr || !customer) {
      return NextResponse.json({ error: 'customer_not_found' }, { status: 404 });
    }

    // ---- Create booking based on type ----
    let bookingData: Record<string, unknown> = {
      customer_user_id: data.customer_user_id,
      status: 'quoted',
      created_at: now,
      updated_at: now,
      admin_notes: data.discount_reason || null,
      expires_at: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    };

    let bookingId: string;
    let bookingDetails: Record<string, unknown> = {};
    let emailSubject = '';
    let emailTemplate = '';

    if (data.booking_type === 'driver') {
      // ---- On-demand driver booking ----
      if (!data.driver_id || !data.engagement_type || !data.vehicle_class || !data.duration_hours) {
        return NextResponse.json({ error: 'invalid_driver_booking_data' }, { status: 400 });
      }

      const { data: driver, error: driverErr } = await A
        .from('driver_profiles')
        .select('id, users!inner(full_name, phone)')
        .eq('id', data.driver_id)
        .single();

      if (driverErr || !driver) {
        return NextResponse.json({ error: 'driver_not_found' }, { status: 404 });
      }

      const discountAmount = data.base_price * ((data.discount_percent || 0) / 100);
      const finalPrice = data.base_price - discountAmount;

      const engagementData = {
        customer_user_id: data.customer_user_id,
        driver_id: data.driver_id,
        engagement_type: data.engagement_type,
        vehicle_class: data.vehicle_class,
        status: 'quoted',
        starts_at: data.starts_at,
        duration_hours: data.duration_hours,
        customer_price_total: finalPrice,
        currency: 'NGN',
        created_by_admin: user.id,
        admin_notes: data.discount_reason || null,
        expires_at: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: now,
        updated_at: now,
      };

      const { data: engagement, error: engagementErr } = await A
        .from('engagements')
        .insert(engagementData)
        .select('id')
        .single();

      if (engagementErr || !engagement) {
        return NextResponse.json({ error: 'booking_creation_failed' }, { status: 500 });
      }

      bookingId = engagement.id;
      bookingDetails = {
        driver: driver.users?.full_name || 'Driver',
        driverPhone: driver.users?.phone,
        type: 'On-demand driver',
        duration: `${data.duration_hours} hours`,
        class: data.vehicle_class,
      };
      emailSubject = `Your ${data.engagement_type === 'hourly' ? 'hourly' : 'daily'} driver booking quote from Avanti`;
      emailTemplate = generateDriverBookingEmail(customer, bookingDetails as any, data.base_price, discountAmount, finalPrice);
    } else if (data.booking_type === 'car_hire') {
      // ---- Car hire booking ----
      if (!data.vehicle_id || !data.rental_days) {
        return NextResponse.json({ error: 'invalid_car_hire_data' }, { status: 400 });
      }

      const { data: vehicle, error: vehicleErr } = await A
        .from('hire_vehicles')
        .select('id, make, model, year')
        .eq('id', data.vehicle_id)
        .single();

      if (vehicleErr || !vehicle) {
        return NextResponse.json({ error: 'vehicle_not_found' }, { status: 404 });
      }

      const discountAmount = data.base_price * ((data.discount_percent || 0) / 100);
      const finalPrice = data.base_price - discountAmount;

      const carHireData = {
        customer_user_id: data.customer_user_id,
        vehicle_id: data.vehicle_id,
        status: 'quoted',
        start_date: data.starts_at,
        rental_days: data.rental_days,
        indicative_total: finalPrice,
        offer_total: null,
        created_by_admin: user.id,
        admin_notes: data.discount_reason || null,
        expires_at: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: now,
        updated_at: now,
      };

      const { data: booking, error: bookingErr } = await A
        .from('car_hire_bookings')
        .insert(carHireData)
        .select('id')
        .single();

      if (bookingErr || !booking) {
        return NextResponse.json({ error: 'booking_creation_failed' }, { status: 500 });
      }

      bookingId = booking.id;
      bookingDetails = {
        vehicle: `${vehicle.make} ${vehicle.model}${vehicle.year ? ` · ${vehicle.year}` : ''}`,
        days: data.rental_days,
        type: 'Car hire',
      };
      emailSubject = `Your car hire quote from Avanti — ${vehicle.make} ${vehicle.model}`;
      emailTemplate = generateCarHireBookingEmail(customer, bookingDetails as any, data.base_price, discountAmount, finalPrice);
      } else {
      // ---- Permanent placement ----
      if (!data.driver_id_placement || !data.monthly_salary || !data.placement_duration_months) {
        return NextResponse.json({ error: 'invalid_placement_data' }, { status: 400 });
      }

      const { data: driver, error: driverErr } = await A
        .from('driver_profiles')
        .select('id, users!inner(full_name, phone)')
        .eq('id', data.driver_id_placement)
        .single();

      if (driverErr || !driver) {
        return NextResponse.json({ error: 'driver_not_found' }, { status: 404 });
      }

      // For permanent placement: upfront = 50% of monthly salary
      const upfrontPrice = data.monthly_salary * 0.5;
      const discountAmount = upfrontPrice * ((data.discount_percent || 0) / 100);
      const finalPrice = upfrontPrice - discountAmount;

      const placementData = {
        driver_id: data.driver_id_placement,
        customer_user_id: data.customer_user_id,
        monthly_salary: data.monthly_salary,
        currency: 'NGN',
        start_date: data.placement_start_date,
        status: 'pending', // pending until customer accepts quote
        created_at: now,
        updated_at: now,
      };

      const { data: placement, error: placementErr } = await A
        .from('placements')
        .insert(placementData)
        .select('id')
        .single();

      if (placementErr || !placement) {
        return NextResponse.json({ error: 'placement_creation_failed', details: placementErr }, { status: 500 });
      }

      bookingId = placement.id;
      bookingDetails = {
        driver: driver.users?.full_name || 'Driver',
        driverPhone: driver.users?.phone,
        role: data.placement_role || 'Driver',
        salary: data.monthly_salary,
        duration: `${data.placement_duration_months} month${data.placement_duration_months > 1 ? 's' : ''}`,
        startDate: data.placement_start_date,
        upfrontPrice: upfrontPrice,
      };
      emailSubject = `Your permanent placement quote from Avanti`;
      emailTemplate = generatePermanentPlacementEmail(customer, bookingDetails as any, upfrontPrice, discountAmount, finalPrice);
    }

    // ---- Send email notification ----
    try {
      await sendEmail({
        to: customer.email!,
        subject: emailSubject,
        html: emailTemplate,
      });
    } catch (emailErr) {
      console.error('[admin/transactions/create] email send failed:', emailErr);
      // Don't fail the booking if email fails; log it and continue
    }

    // ---- Audit log ----
    try {
      await A.from('audit_logs').insert({
        actor_user_id: user.id,
        actor_role: user.activeRole,
        entity_type: data.booking_type === 'driver' ? 'engagements' : 'car_hire_bookings',
        entity_id: bookingId,
        action: 'create',
        metadata: {
          control: 'admin_transaction_create',
          customer_user_id: data.customer_user_id,
          discount_reason: data.discount_reason,
          discount_percent: data.discount_percent,
        },
      });
    } catch { /* best-effort */ }

    return NextResponse.json({ ok: true, bookingId, bookingType: data.booking_type });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'invalid_body', details: err.errors }, { status: 400 });
    }
    console.error('[admin/transactions/create]', err);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

// Email template helpers
function generateDriverBookingEmail(
  customer: { full_name: string; email: string },
  details: { driver: string; driverPhone?: string; type: string; duration: string; class: string },
  basePrice: number,
  discount: number,
  total: number,
): string {
  const acceptLink = `${process.env.NEXT_PUBLIC_APP_URL}/customer/engagements`;
  const rejectLink = `${process.env.NEXT_PUBLIC_APP_URL}/customer`;

  return `
    <html>
      <body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1>Your Driver Booking Quote</h1>
          <p>Hi ${customer.full_name},</p>
          <p>We have a driver available for your booking:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Driver:</strong> ${details.driver}</p>
            <p><strong>Type:</strong> ${details.type}</p>
            <p><strong>Duration:</strong> ${details.duration}</p>
            <p><strong>Vehicle Class:</strong> ${details.class}</p>
          </div>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Base Price:</strong> ₦${basePrice.toLocaleString()}</p>
            ${discount > 0 ? `<p><strong>Discount:</strong> -₦${discount.toLocaleString()}</p>` : ''}
            <p style="font-size: 18px; font-weight: bold; color: #000;"><strong>Total:</strong> ₦${total.toLocaleString()}</p>
          </div>

          <p>To accept this booking, please visit your Avanti app or click the link below:</p>
          <a href="${acceptLink}" style="display: inline-block; background: #00d084; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; font-weight: bold; margin: 20px 0;">View My Bookings</a>

          <p>This quote expires in 24 hours.</p>
          <p>Best,<br>The Avanti Team</p>
        </div>
      </body>
    </html>
  `;
}

function generateCarHireBookingEmail(
  customer: { full_name: string; email: string },
  details: { vehicle: string; days: number; type: string },
  basePrice: number,
  discount: number,
  total: number,
): string {
  const acceptLink = `${process.env.NEXT_PUBLIC_APP_URL}/customer/car-hire/bookings`;

  return `
    <html>
      <body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1>Your Car Hire Quote</h1>
          <p>Hi ${customer.full_name},</p>
          <p>We have a car available for your booking:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Vehicle:</strong> ${details.vehicle}</p>
            <p><strong>Rental Period:</strong> ${details.days} day${details.days > 1 ? 's' : ''}</p>
          </div>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Base Price:</strong> ₦${basePrice.toLocaleString()}</p>
            ${discount > 0 ? `<p><strong>Discount:</strong> -₦${discount.toLocaleString()}</p>` : ''}
            <p style="font-size: 18px; font-weight: bold; color: #000;"><strong>Total:</strong> ₦${total.toLocaleString()}</p>
          </div>

          <p>To accept this booking, please visit your Avanti app or click the link below:</p>
          <a href="${acceptLink}" style="display: inline-block; background: #00d084; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; font-weight: bold; margin: 20px 0;">View My Car Hire Bookings</a>

          <p>This quote expires in 24 hours.</p>
          <p>Best,<br>The Avanti Team</p>
        </div>
      </body>
    </html>
  `;
}

function generatePermanentPlacementEmail(
  customer: { full_name: string; email: string },
  details: { driver: string; driverPhone?: string; role: string; salary: number; duration: string; startDate: string },
  basePrice: number,
  discount: number,
  total: number,
): string {
  const acceptLink = `${process.env.NEXT_PUBLIC_APP_URL}/customer`;

  return `
    <html>
      <body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1>Your Permanent Placement Quote</h1>
          <p>Hi ${customer.full_name},</p>
          <p>We have a driver available for your permanent placement:</p>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Driver:</strong> ${details.driver}</p>
            ${details.driverPhone ? `<p><strong>Contact:</strong> ${details.driverPhone}</p>` : ''}
            <p><strong>Role:</strong> ${details.role}</p>
            <p><strong>Monthly Salary:</strong> ₦${details.salary.toLocaleString()}</p>
            <p><strong>Duration:</strong> ${details.duration}</p>
            <p><strong>Start Date:</strong> ${details.startDate}</p>
          </div>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Base Quote:</strong> ₦${basePrice.toLocaleString()}</p>
            ${discount > 0 ? `<p><strong>Discount:</strong> -₦${discount.toLocaleString()}</p>` : ''}
            <p style="font-size: 18px; font-weight: bold; color: #000;"><strong>Total Contract Value:</strong> ₦${total.toLocaleString()}</p>
          </div>

          <p>To accept this placement, please visit your Avanti app or contact our team:</p>
          <a href="${acceptLink}" style="display: inline-block; background: #00d084; color: white; padding: 12px 24px; border-radius: 24px; text-decoration: none; font-weight: bold; margin: 20px 0;">Review Placement</a>

          <p>This quote expires in 24 hours. Once accepted, we'll initiate the onboarding process.</p>
          <p>Best,<br>The Avanti Team</p>
        </div>
      </body>
    </html>
  `;
}
