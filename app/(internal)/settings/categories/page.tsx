"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";

type Sub = { id: string; name: string; slug: string; sortOrder: number };
type Category = { id: string; name: string; slug: string; sortOrder: number; subcategories: Sub[] };

export default function CategoriesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newCat, setNewCat] = useState({ name: "", slug: "" });
  const [newSub, setNewSub] = useState<Record<string, { name: string; slug: string }>>({});
  const [adding, setAdding] = useState(false);
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/settings/categories");
    setCats(await res.json());
  }

  useEffect(() => { load(); }, []);

  function toSlug(name: string) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }

  async function addCategory() {
    if (!newCat.name) return;
    await fetch("/api/settings/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCat),
    });
    setNewCat({ name: "", slug: "" });
    setAdding(false);
    load();
  }

  async function addSubcategory(categoryId: string) {
    const s = newSub[categoryId];
    if (!s?.name) return;
    await fetch("/api/settings/subcategories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, ...s }),
    });
    setNewSub((prev) => ({ ...prev, [categoryId]: { name: "", slug: "" } }));
    setAddingSubFor(null);
    load();
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Manage property categories and subcategories.</p>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Category
        </button>
      </div>

      {adding && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
              value={newCat.name}
              onChange={(e) => setNewCat({ name: e.target.value, slug: toSlug(e.target.value) })}
              placeholder="e.g. Residential"
              autoFocus
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-gray-900"
              value={newCat.slug}
              onChange={(e) => setNewCat((p) => ({ ...p, slug: e.target.value }))}
              placeholder="residential"
            />
          </div>
          <button onClick={addCategory} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800">Save</button>
          <button onClick={() => setAdding(false)} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-900">Cancel</button>
        </div>
      )}

      <div className="space-y-2">
        {cats.map((cat) => (
          <div key={cat.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpanded((p) => ({ ...p, [cat.id]: !p[cat.id] }))}
              className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              {expanded[cat.id]
                ? <ChevronDown className="w-4 h-4 text-gray-400" />
                : <ChevronRight className="w-4 h-4 text-gray-400" />}
              <span className="font-medium text-gray-900 text-sm">{cat.name}</span>
              <span className="font-mono text-xs text-gray-400">{cat.slug}</span>
              <span className="ml-auto text-xs text-gray-400">{cat.subcategories.length} subcategories</span>
            </button>

            {expanded[cat.id] && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                <div className="space-y-1.5 mb-3">
                  {cat.subcategories.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-gray-200">
                      <span className="text-sm text-gray-700">{sub.name}</span>
                      <span className="font-mono text-xs text-gray-400">{sub.slug}</span>
                    </div>
                  ))}
                </div>

                {addingSubFor === cat.id ? (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                        placeholder="Subcategory name"
                        value={newSub[cat.id]?.name ?? ""}
                        onChange={(e) => setNewSub((p) => ({
                          ...p,
                          [cat.id]: { name: e.target.value, slug: toSlug(e.target.value) },
                        }))}
                        autoFocus
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-gray-900"
                        placeholder="slug"
                        value={newSub[cat.id]?.slug ?? ""}
                        onChange={(e) => setNewSub((p) => ({ ...p, [cat.id]: { ...p[cat.id], slug: e.target.value } }))}
                      />
                    </div>
                    <button onClick={() => addSubcategory(cat.id)} className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800">Add</button>
                    <button onClick={() => setAddingSubFor(null)} className="px-2 py-1.5 text-sm text-gray-400 hover:text-gray-700">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingSubFor(cat.id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Subcategory
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
