"use client";

import Link from "next/link";
import { ArrowLeft, Users, Building2 } from "lucide-react";

type Contact = { id: string; name: string; type: string };
type Category = { id: string; name: string };

type Props = {
  type: "buyer" | "tenant";
  contacts: Contact[];
  categories: Category[];
  action: (fd: FormData) => Promise<void>;
  defaultContactId?: string;
};

const FURNISHING = ["Fully Furnished", "Semi Furnished", "Unfurnished", "Any"];
const PRIORITIES = ["High", "Medium", "Low"];
const TIMELINES  = ["Immediate", "1-3 months", "3-6 months", "6-12 months", "12+ months"];

export default function RequirementForm({ type, contacts, categories, action, defaultContactId }: Props) {
  const isBuyer = type === "buyer";
  const backHref = `/projects?tab=${isBuyer ? "Buyer+Requirements" : "Tenant+Requirements"}`;
  const title = isBuyer ? "Add Buyer Requirement" : "Add Tenant Requirement";

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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Contact *</label>
                <select name="contactId" required defaultValue={defaultContactId ?? ""} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="">Select contact…</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Category *</label>
                <select name="categoryId" required className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="">Select category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Budget / Rent */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {isBuyer ? "Budget Range" : "Rent Budget"}
            </p>
            <div className="grid grid-cols-2 gap-4">
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
                </>
              )}
            </div>
          </div>

          {/* Property Preferences */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Property Preferences</p>
            <div className="grid grid-cols-2 gap-4">
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
                <input name="propertySubtype" placeholder="e.g. Apartment, Villa, Office"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Furnishing</label>
                <select name="furnishing" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="">Any</option>
                  {FURNISHING.map((f) => <option key={f} value={f}>{f}</option>)}
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
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
              <textarea name="notes" rows={3} placeholder="Any additional requirements or preferences…"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
            </div>
          </div>

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
