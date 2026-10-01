'use client';

import { useState } from 'react';
import { Loader2, ChevronRight } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { createClient } from '@/lib/supabase/client';

type Step = 'select-customer' | 'select-type' | 'select-resource' | 'set-pricing' | 'review';
type BookingType = 'driver' | 'car_hire' | 'permanent_placement';

export function CreateTransactionForm() {
  const supabase = createClient();
  const [step, setStep] = useState<Step>('select-customer');
  const [busy, setBusy] = useState(false);

  // Step 1: Customer selection
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // Step 2: Booking type
  const [bookingType, setBookingType] = useState<BookingType>('driver');

  // Step 3: Resource selection
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [startsAt, setStartsAt] = useState('');
  const [durationHours, setDurationHours] = useState('1');
  const [rentalDays, setRentalDays] = useState('1');
  const [engagementType, setEngagementType] = useState<'hourly' | 'full_day'>('hourly');
  const [vehicleClass, setVehicleClass] = useState('sedan');

  // Permanent placement specific
  const [placementRole, setPlacementRole] = useState('');
  const [monthlySalary, setMonthlySalary] = useState('');
  const [placementStartDate, setPlacementStartDate] = useState('');
  const [placementDurationMonths, setPlacementDurationMonths] = useState('1');

  // Step 4: Pricing
  const [basePrice, setBasePrice] = useState('');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [discountReason, setDiscountReason] = useState('');

  // Search customers
  async function handleSearchCustomers() {
    if (!customerSearch.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, phone')
        .or(
          `full_name.ilike.%${customerSearch}%,email.ilike.%${customerSearch}%,phone.ilike.%${customerSearch}%`
        )
        .limit(10);

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setBusy(false);
    }
  }

  // Get drivers for selection
  async function fetchDrivers() {
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select(
          'id, users(full_name, phone), verification_tier, vehicle_class_experience'
        )
        .eq('verification_status', 'submitted')
        .limit(20);

      if (error) throw error;
      setDrivers(data || []);
    } catch (err) {
      toast.error('Failed to load drivers');
    } finally {
      setBusy(false);
    }
  }

  // Get vehicles for selection
  async function fetchVehicles() {
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from('hire_vehicles')
        .select('id, make, model, year, daily_rate')
        .eq('active', true)
        .limit(20);

      if (error) throw error;
      setVehicles(data || []);
    } catch (err) {
      toast.error('Failed to load vehicles');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateTransaction() {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        customer_user_id: selectedCustomer.id,
        booking_type: bookingType,
        starts_at: startsAt,
        base_price: parseFloat(basePrice),
        discount_percent: parseInt(discountPercent),
        discount_reason: discountReason || undefined,
      };

      if (bookingType === 'driver') {
        payload.driver_id = selectedDriver.id;
        payload.engagement_type = engagementType;
        payload.vehicle_class = vehicleClass;
        payload.duration_hours = parseInt(durationHours);
      } else if (bookingType === 'car_hire') {
        payload.vehicle_id = selectedVehicle.id;
        payload.rental_days = parseInt(rentalDays);
               } else {
        payload.driver_id_placement = selectedDriver.id;
        payload.placement_role = placementRole;
        payload.monthly_salary = parseFloat(monthlySalary);
        payload.placement_start_date = placementStartDate;
        payload.placement_duration_months = parseInt(placementDurationMonths);
        payload.starts_at = new Date().toISOString(); // Use current date for API, not important for placement
      }

      const res = await fetch('/api/admin/transactions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Creation failed');
      }

      toast.success('Transaction created! Email sent to customer.');
      // Reset form
      setStep('select-customer');
      setSelectedCustomer(null);
      setBookingType('driver');
      setSelectedDriver(null);
      setSelectedVehicle(null);
      setBasePrice('');
      setDiscountPercent('0');
      setDiscountReason('');
      setPlacementRole('');
      setMonthlySalary('');
      setPlacementStartDate('');
      setPlacementDurationMonths('1');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Creation failed');
    } finally {
      setBusy(false);
    }
  }

  const finalPrice =
    parseFloat(basePrice || '0') * (1 - (parseInt(discountPercent) || 0) / 100);

  return (
    <div className="mt-8 space-y-6">
      {/* Step 1: Customer Selection */}
      {step === 'select-customer' && (
        <div className="rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin-sm">
          <h2 className="mb-4 font-display text-lg font-semibold">Select Customer</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchCustomers()}
              className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
            />
            <button
              onClick={handleSearchCustomers}
              disabled={busy || !customerSearch.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-admin-green px-4 py-2 font-body text-sm font-medium text-white disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Search
            </button>
          </div>

          {customers.length > 0 && (
            <div className="mt-4 space-y-2">
              {customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCustomer(c);
                    setStep('select-type');
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-admin-border bg-admin-bg p-3 text-left hover:border-admin-green/40"
                >
                  <div>
                    <div className="font-body font-medium text-admin-text">{c.full_name}</div>
                    <div className="font-body text-xs text-admin-text-muted">{c.email}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-admin-text-muted" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Booking Type */}
      {step === 'select-type' && selectedCustomer && (
        <div className="rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin-sm">
          <h2 className="mb-4 font-display text-lg font-semibold">Booking Type</h2>
          <div className="space-y-3">
            <button
              onClick={() => {
                setBookingType('driver');
                fetchDrivers();
                setStep('select-resource');
              }}
              className="flex w-full items-center gap-4 rounded-xl border-2 border-admin-border p-4 text-left hover:border-admin-green/40"
            >
              <div>
                <div className="font-body font-medium text-admin-text">On-Demand Driver</div>
                <div className="font-body text-xs text-admin-text-muted">
                  Hourly or full-day engagement with a verified driver
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-admin-text-muted" />
            </button>

            <button
              onClick={() => {
                setBookingType('car_hire');
                fetchVehicles();
                setStep('select-resource');
              }}
              className="flex w-full items-center gap-4 rounded-xl border-2 border-admin-border p-4 text-left hover:border-admin-green/40"
            >
              <div>
                <div className="font-body font-medium text-admin-text">Car Hire</div>
                <div className="font-body text-xs text-admin-text-muted">
                  Multi-day car rental with driver included
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-admin-text-muted" />
            </button>

            <button
              onClick={() => {
                setBookingType('permanent_placement');
                fetchDrivers();
                setStep('select-resource');
              }}
              className="flex w-full items-center gap-4 rounded-xl border-2 border-admin-border p-4 text-left hover:border-admin-green/40"
            >
              <div>
                <div className="font-body font-medium text-admin-text">Permanent Placement</div>
                <div className="font-body text-xs text-admin-text-muted">
                  Long-term staffing solution with monthly salary
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-admin-text-muted" />
            </button>
          </div>
          <button
            onClick={() => setStep('select-customer')}
            className="mt-4 text-admin-text-muted hover:text-admin-text"
          >
            ← Back
          </button>
        </div>
      )}

      {/* Step 3: Resource Selection - On-Demand Driver */}
      {step === 'select-resource' && selectedCustomer && bookingType === 'driver' && (
        <div className="rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin-sm">
          <h2 className="mb-4 font-display text-lg font-semibold">Select Driver & Details</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block font-body text-sm font-medium text-admin-text">
                Driver
              </label>
              <select
                value={selectedDriver?.id || ''}
                onChange={(e) => {
                  const d = drivers.find((d) => d.id === e.target.value);
                  setSelectedDriver(d);
                }}
                className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
              >
                <option value="">Select a driver...</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.users?.full_name} · {d.verification_tier || 'Tier 0'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-body text-sm font-medium text-admin-text">
                Engagement Type
              </label>
              <select
                value={engagementType}
                onChange={(e) => setEngagementType(e.target.value as 'hourly' | 'full_day')}
                className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
              >
                <option value="hourly">Hourly</option>
                <option value="full_day">Full Day</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block font-body text-sm font-medium text-admin-text">
                Vehicle Class
              </label>
              <select
                value={vehicleClass}
                onChange={(e) => setVehicleClass(e.target.value)}
                className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
              >
                {['sedan', 'suv', 'executive', 'van', 'pickup'].map((vc) => (
                  <option key={vc} value={vc}>
                    {vc.charAt(0).toUpperCase() + vc.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-body text-sm font-medium text-admin-text">
                Duration (hours)
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
              />
            </div>

            <div>
              <label className="mb-2 block font-body text-sm font-medium text-admin-text">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
              />
            </div>

            <button
              onClick={() => setStep('set-pricing')}
              disabled={!selectedDriver || !startsAt}
              className="mt-4 w-full rounded-xl bg-admin-green px-4 py-2 font-body font-medium text-white disabled:opacity-50"
            >
              Continue to Pricing →
            </button>
          </div>
          <button
            onClick={() => setStep('select-type')}
            className="mt-4 text-admin-text-muted hover:text-admin-text"
          >
            ← Back
          </button>
        </div>
      )}

      {/* Step 3: Resource Selection - Car Hire */}
      {step === 'select-resource' && selectedCustomer && bookingType === 'car_hire' && (
        <div className="rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin-sm">
          <h2 className="mb-4 font-display text-lg font-semibold">Select Vehicle & Details</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block font-body text-sm font-medium text-admin-text">
                Vehicle
              </label>
              <select
                value={selectedVehicle?.id || ''}
                onChange={(e) => {
                  const v = vehicles.find((v) => v.id === e.target.value);
                  setSelectedVehicle(v);
                }}
                className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
              >
                <option value="">Select a vehicle...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} {v.year ? `(${v.year})` : ''} · ₦{v.daily_rate}/day
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-body text-sm font-medium text-admin-text">
                Rental Days
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={rentalDays}
                onChange={(e) => setRentalDays(e.target.value)}
                className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
              />
            </div>

            <div>
              <label className="mb-2 block font-body text-sm font-medium text-admin-text">
                Start Date
              </label>
              <input
                type="date"
                value={startsAt.split('T')[0] || ''}
                onChange={(e) =>
                  setStartsAt(e.target.value ? `${e.target.value}T00:00:00` : '')
                }
                className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
              />
            </div>

            <button
              onClick={() => setStep('set-pricing')}
              disabled={!selectedVehicle || !startsAt}
              className="mt-4 w-full rounded-xl bg-admin-green px-4 py-2 font-body font-medium text-white disabled:opacity-50"
            >
              Continue to Pricing →
            </button>
          </div>
          <button
            onClick={() => setStep('select-type')}
            className="mt-4 text-admin-text-muted hover:text-admin-text"
          >
            ← Back
          </button>
        </div>
      )}

      {/* Step 3: Resource Selection - Permanent Placement */}
      {step === 'select-resource' && selectedCustomer && bookingType === 'permanent_placement' && (
        <div className="rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin-sm">
          <h2 className="mb-4 font-display text-lg font-semibold">Select Driver & Placement Terms</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block font-body text-sm font-medium text-admin-text">
                Driver
              </label>
              <select
                value={selectedDriver?.id || ''}
                onChange={(e) => {
                  const d = drivers.find((d) => d.id === e.target.value);
                  setSelectedDriver(d);
                }}
                className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
              >
                <option value="">Select a driver...</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.users?.full_name} · {d.verification_tier || 'Tier 0'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block font-body text-sm font-medium text-admin-text">
                Position/Role
              </label>
              <input
                type="text"
                placeholder="e.g., Executive Driver, Personal Assistant"
                value={placementRole}
                onChange={(e) => setPlacementRole(e.target.value)}
                className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
              />
            </div>

            <div>
              <label className="mb-2 block font-body text-sm font-medium text-admin-text">
                Monthly Salary (₦)
              </label>
              <input
                type="number"
                min="0"
                step="10000"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(e.target.value)}
                className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
              />
            </div>

            <div>
              <label className="mb-2 block font-body text-sm font-medium text-admin-text">
                Start Date
              </label>
              <input
                type="date"
                value={placementStartDate}
                onChange={(e) => setPlacementStartDate(e.target.value)}
                className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
              />
            </div>

            <div>
              <label className="mb-2 block font-body text-sm font-medium text-admin-text">
                Duration (months)
              </label>
              <input
                type="number"
                min="1"
                max="36"
                value={placementDurationMonths}
                onChange={(e) => setPlacementDurationMonths(e.target.value)}
                className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
              />
            </div>

            <button
              onClick={() => setStep('set-pricing')}
              disabled={!selectedDriver || !placementRole || !monthlySalary || !placementStartDate}
              className="mt-4 w-full rounded-xl bg-admin-green px-4 py-2 font-body font-medium text-white disabled:opacity-50"
            >
              Continue to Pricing →
            </button>
          </div>
          <button
            onClick={() => setStep('select-type')}
            className="mt-4 text-admin-text-muted hover:text-admin-text"
          >
            ← Back
          </button>
        </div>
      )}

      {/* Step 4: Pricing */}
      {step === 'set-pricing' && selectedCustomer && (
        <div className="rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin-sm">
          <h2 className="mb-4 font-display text-lg font-semibold">Set Pricing</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block font-body text-sm font-medium text-admin-text">
                Base Price (₦)
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
              />
            </div>

            <div>
              <label className="mb-2 block font-body text-sm font-medium text-admin-text">
                Discount (%)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
              />
            </div>

            {parseInt(discountPercent) > 0 && (
              <div>
                <label className="mb-2 block font-body text-sm font-medium text-admin-text">
                  Discount Reason (required)
                </label>
                <input
                  type="text"
                  placeholder="e.g., First-time customer, Loyalty, Bulk booking"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="w-full rounded-xl border border-admin-border bg-admin-bg px-3 py-2 font-body text-sm outline-none focus:border-admin-green focus:ring-2 focus:ring-admin-green/20"
                />
              </div>
            )}

            <div className="rounded-xl bg-admin-bg p-4">
              <div className="flex justify-between font-body text-sm">
                <span>Base:</span>
                <span>₦{parseFloat(basePrice || '0').toLocaleString()}</span>
              </div>
              {parseInt(discountPercent) > 0 && (
                <div className="flex justify-between font-body text-sm text-admin-text-muted">
                  <span>Discount ({discountPercent}%):</span>
                  <span>-₦{(parseFloat(basePrice || '0') * (parseInt(discountPercent) / 100)).toLocaleString()}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t border-admin-border pt-2 font-body font-medium text-admin-text">
                <span>Total:</span>
                <span>₦{finalPrice.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => setStep('review')}
              className="mt-4 w-full rounded-xl bg-admin-green px-4 py-2 font-body font-medium text-white"
            >
              Review & Send →
            </button>
          </div>
          <button
            onClick={() => setStep('select-resource')}
            className="mt-4 text-admin-text-muted hover:text-admin-text"
          >
            ← Back
          </button>
        </div>
      )}

      {/* Step 5: Review */}
      {step === 'review' && selectedCustomer && (
        <div className="rounded-2xl border border-admin-border bg-admin-card p-6 shadow-admin-sm">
          <h2 className="mb-4 font-display text-lg font-semibold">Review & Send</h2>
          <div className="space-y-4">
            <div className="rounded-xl bg-admin-bg p-4">
              <div className="mb-4 pb-4 border-b border-admin-border">
                <div className="font-body text-sm text-admin-text-muted">Customer</div>
                <div className="font-body font-medium text-admin-text">{selectedCustomer.full_name}</div>
                <div className="font-body text-xs text-admin-text-muted">{selectedCustomer.email}</div>
              </div>

              {bookingType === 'driver' && selectedDriver && (
                <div className="pb-4 border-b border-admin-border">
                  <div className="font-body text-sm text-admin-text-muted">Driver</div>
                  <div className="font-body font-medium text-admin-text">{selectedDriver.users?.full_name}</div>
                  <div className="font-body text-xs text-admin-text-muted">
                    {engagementType} · {vehicleClass} · {durationHours}h · {startsAt}
                  </div>
                </div>
              )}

              {bookingType === 'car_hire' && selectedVehicle && (
                <div className="pb-4 border-b border-admin-border">
                  <div className="font-body text-sm text-admin-text-muted">Vehicle</div>
                  <div className="font-body font-medium text-admin-text">
                    {selectedVehicle.make} {selectedVehicle.model}
                  </div>
                  <div className="font-body text-xs text-admin-text-muted">
                    {rentalDays} days · {startsAt}
                  </div>
                </div>
              )}

              {bookingType === 'permanent_placement' && selectedDriver && (
                <div className="pb-4 border-b border-admin-border">
                  <div className="font-body text-sm text-admin-text-muted">Placement</div>
                  <div className="font-body font-medium text-admin-text">{selectedDriver.users?.full_name}</div>
                  <div className="font-body text-xs text-admin-text-muted">
                    {placementRole} · ₦{parseInt(monthlySalary).toLocaleString()}/month · {placementDurationMonths} months · {placementStartDate}
                  </div>
                </div>
              )}

              <div>
                <div className="font-body text-sm text-admin-text-muted">Total Price</div>
                <div className="font-display text-2xl font-semibold text-admin-text">
                  ₦{finalPrice.toLocaleString()}
                </div>
              </div>
            </div>

            <p className="font-body text-sm text-admin-text-muted">
              A quote email will be sent to {selectedCustomer.email} with a 24-hour acceptance window.
            </p>

            <button
              onClick={handleCreateTransaction}
              disabled={busy || !basePrice}
              className="w-full rounded-xl bg-admin-green px-4 py-2 font-body font-medium text-white disabled:opacity-50"
            >
              {busy && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
              Create & Send Quote
            </button>
          </div>
          <button
            onClick={() => setStep('set-pricing')}
            className="mt-4 text-admin-text-muted hover:text-admin-text"
          >
            ← Back
          </button>
        </div>
      )}
    </div>
  );
}
