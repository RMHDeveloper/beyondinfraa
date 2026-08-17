"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Users, Building2, MapPin, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Contact = { id: string; name: string; type: string };
type Category = { id: string; name: string };
type ExtraContact = { name: string; phone: string; email: string };

type Props = {
  type: "buyer" | "tenant";
  contacts: Contact[];
  categories: Category[];
  action: (fd: FormData) => Promise<void>;
  defaultContactId?: string;
};

const FURNISHING = ["Fully Furnished", "Semi Furnished", "Unfurnished", "Any"];
const INDUSTRIAL_FURNISHING = ["Bare Shell", "Warm Shell", "Semi Furnished", "Fully Furnished"];
const PRIORITIES = ["High", "Medium", "Low"];
const TIMELINES  = ["Immediate", "1-3 months", "3-6 months", "6-12 months", "12+ months"];
const INDUSTRIAL_SUBTYPES = ["Factory Shed", "Warehousing"];
const PROPERTY_SHARING = ["Standalone", "Sharing"];
const FACILITY_GRADES = ["Grade A", "Regular"];
const POWER_LEVELS = ["Low Tension", "High Tension", "Basic Connection"];
const ENTITY_TYPES = ["Individual", "Trust", "Company"];

export default function RequirementForm({ type, contacts, categories, action, defaultContactId }: Props) {
  const isBuyer = type === "buyer";
  const [contactId, setContactId] = useState(defaultContactId ?? "");
  const isNewContact = contactId === "__new__";
  const backHref = `/projects?tab=${isBuyer ? "Buyer+Requirements" : "Tenant+Requirements"}`;
  const title = isBuyer ? "Add Buyer Requirement" : "Add Tenant Requirement";

  const [categoryName, setCategoryName] = useState("");
  const isIndustrial = !isBuyer && categoryName === "Industrial";

  const [locations, setLocations] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState("");
  function addLocation() {
    const v = locationInput.trim();
    if (v && !locations.includes(v)) setLocations([...locations, v]);
    setLocationInput("");
  }
  function removeLocation(loc: string) {
    setLocations(locations.filter((l) => l !== loc));
  }

  const [amenities, setAmenities] = useState<string[]>([]);
  const [amenityInput, setAmenityInput] = useState("");
  function addAmenity() {
    const v = amenityInput.trim();
    if (v && !amenities.includes(v)) setAmenities([...amenities, v]);
    setAmenityInput("");
  }
  function removeAmenity(a: string) {
    setAmenities(amenities.filter((x) => x !== a));
  }

  const [extraContacts, setExtraContacts] = useState<ExtraContact[]>([]);
  function addExtraContact() {
    setExtraContacts([...extraContacts, { name: "", phone: "", email: "" }]);
  }
  function updateExtraContact(i: number, field: keyof ExtraContact, value: string) {
    setExtraContacts(extraContacts.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  }
  function removeExtraContact(i: number) {
    setExtraContacts(extraContacts.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <Link href={backHref} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </Link>
        <div>
          <p className="text-xs text-gray-400">ERP System › Requirements › {isBuyer ? "Buyer" : "Tenant"} › New</p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">{title}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-6">
        <form action={action} className="max-w-2xl space-y-4">

          {/* Contact & Category */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              {isBuyer ? <Users className="w-3.5 h-3.5 text-green-600" /> : <Building2 className="w-3.5 h-3.5 text-amber-600" />}
              {isBuyer ? "Buyer" : "Tenant"} Details
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className={cn(isNewContact && "sm:col-span-2")}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Contact *</label>
                <select name="contactId" required value={contactId} onChange={(e) => setContactId(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="">Select contact…</option>
                  <option value="__new__">+ Add New {isBuyer ? "Buyer" : "Tenant"} Contact</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  ))}
                </select>
                {isNewContact && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                    <input name="newContactName" required placeholder="Full Name *"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <input name="newContactPhone" required placeholder="Phone *"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <input name="newContactEmail" type="email" placeholder="Email (optional)"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Category *</label>
                <select name="categoryId" required
                  onChange={(e) => setCategoryName(e.target.selectedOptions[0]?.dataset.name ?? "")}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="">Select category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} data-name={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {!isBuyer && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-600">Additional Contact Persons</label>
                  <button type="button" onClick={addExtraContact}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline">
                    <Plus className="w-3 h-3" /> Add Person
                  </button>
                </div>
                {extraContacts.length > 0 && (
                  <div className="space-y-2">
                    {extraContacts.map((c, i) => (
                      <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                        <input value={c.name} onChange={(e) => updateExtraContact(i, "name", e.target.value)} placeholder="Name"
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <input value={c.phone} onChange={(e) => updateExtraContact(i, "phone", e.target.value)} placeholder="Phone"
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <input value={c.email} onChange={(e) => updateExtraContact(i, "email", e.target.value)} placeholder="Email" type="email"
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        <button type="button" onClick={() => removeExtraContact(i)}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input type="hidden" name="additionalContacts" value={JSON.stringify(extraContacts)} />
              </div>
            )}
          </div>

          {/* Budget / Rent */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {isBuyer ? "Budget Range" : "Rent Budget"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isBuyer ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Min Budget (₹)</label>
                    <input name="budgetMin" type="number" step="100000" placeholder="e.g. 5000000"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Max Budget (₹)</label>
                    <input name="budgetMax" type="number" step="100000" placeholder="e.g. 15000000"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Min Rent (₹/mo)</label>
                    <input name="rentMin" type="number" step="1000" placeholder="e.g. 20000"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Max Rent (₹/mo)</label>
                    <input name="rentMax" type="number" step="1000" placeholder="e.g. 50000"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Deposit Budget (₹)</label>
                    <input name="depositBudget" type="number" step="10000"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Lease Duration (months)</label>
                    <input name="leaseDuration" type="number" placeholder="e.g. 24"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Lock-in Period (months)</label>
                    <input name="lockInPeriod" type="number" placeholder="e.g. 12"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Move-in Date</label>
                    <input name="moveInDate" type="date"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Property Preferences */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Property Preferences</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Min Area (sq.ft)</label>
                <input name="areaMin" type="number" placeholder="e.g. 800"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Max Area (sq.ft)</label>
                <input name="areaMax" type="number" placeholder="e.g. 2000"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              {isBuyer && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">BHK</label>
                  <input name="bhk" placeholder="e.g. 2BHK, 3BHK"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Sub-type</label>
                {isIndustrial ? (
                  <select name="propertySubtype" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                    <option value="">Select…</option>
                    {INDUSTRIAL_SUBTYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input name="propertySubtype" placeholder="e.g. Apartment, Villa, Office"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Furnishing</label>
                <select name="furnishing" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="">Any</option>
                  {(isIndustrial ? INDUSTRIAL_FURNISHING : FURNISHING).map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              {isBuyer ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Timeline</label>
                  <select name="timeline" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                    <option value="">Select…</option>
                    {TIMELINES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Operational Requirements</label>
                  <input name="operationalReqs" placeholder="e.g. 3-phase power, loading bay"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
                <select name="priority" defaultValue="Medium" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {!isBuyer && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Preferred Locations</label>
                <div className="flex gap-2">
                  <input value={locationInput} onChange={(e) => setLocationInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLocation(); } }}
                    placeholder="Type an area and press Enter"
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <button type="button" onClick={addLocation}
                    className="text-xs font-bold text-blue-600 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                    Add
                  </button>
                </div>
                {locations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {locations.map((l) => (
                      <span key={l} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                        <MapPin className="w-3 h-3" />{l}
                        <button type="button" onClick={() => removeLocation(l)} className="hover:text-blue-900">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <input type="hidden" name="preferredLocations" value={JSON.stringify(locations)} />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
              <textarea name="notes" rows={3} placeholder="Any additional requirements or preferences…"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
            </div>
          </div>

          {isIndustrial && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Industrial Requirements</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Car Parks Required</label>
                  <input name="carParksRequired" type="number" placeholder="e.g. 2"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Floor Preference</label>
                  <input name="floorPreference" placeholder="e.g. Ground floor"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Property Sharing</label>
                  <select name="propertySharing" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                    <option value="">Select…</option>
                    {PROPERTY_SHARING.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Flooring Type</label>
                  <input name="flooringType" placeholder="e.g. IPS, Vitrified tile"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Type of Facility</label>
                  <select name="facilityGrade" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                    <option value="">Select…</option>
                    {FACILITY_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Power Connection Level</label>
                  <select name="powerConnectionLevel" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                    <option value="">Select…</option>
                    {POWER_LEVELS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Age of Property</label>
                  <input name="propertyAgePreference" placeholder="e.g. Under 5 years, Any"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Direction Facing</label>
                  <input name="directionFacing" placeholder="e.g. East"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Ownership Preference</label>
                  <select name="entityType" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                    <option value="">Select…</option>
                    {ENTITY_TYPES.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Breakup (Cheque/Cash)</label>
                  <input name="paymentBreakup" placeholder="e.g. 80% cheque / 20% cash"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Brokerage Agreed (%)</label>
                  <input name="brokeragePct" type="number" step="0.1" placeholder="e.g. 2"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Amenities Expected</label>
                <div className="flex gap-2">
                  <input value={amenityInput} onChange={(e) => setAmenityInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAmenity(); } }}
                    placeholder="Type an amenity and press Enter"
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <button type="button" onClick={addAmenity}
                    className="text-xs font-bold text-blue-600 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50">
                    Add
                  </button>
                </div>
                {amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {amenities.map((a) => (
                      <span key={a} className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-lg">
                        {a}
                        <button type="button" onClick={() => removeAmenity(a)} className="hover:text-amber-900">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <input type="hidden" name="features" value={JSON.stringify(amenities)} />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit"
              className="bg-blue-600 text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
              Save Requirement
            </button>
            <Link href={backHref}
              className="text-sm font-semibold text-gray-500 px-5 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
