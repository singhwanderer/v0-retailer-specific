"use client"

import { Info, Upload, Plus } from "lucide-react"

interface Screen1Props {
  onNavigateToProfile: () => void
}

const profiles = [
  {
    name: "Footwear — Core Compliance",
    category: "Footwear",
    attributes: "34 attributes",
    status: "Active" as const,
    lastUpdated: "Mar 8, 2026",
    actions: ["Edit", "Duplicate", "Deactivate"],
    isLink: true,
  },
  {
    name: "Apparel — Extended Sustainability",
    category: "Women's Apparel",
    attributes: "51 attributes",
    status: "Active" as const,
    lastUpdated: "Feb 14, 2026",
    actions: ["Edit", "Duplicate", "Deactivate"],
    isLink: false,
  },
  {
    name: "Jewellery — Base Requirements",
    category: "Jewellery",
    attributes: "22 attributes",
    status: "Draft" as const,
    lastUpdated: "Mar 11, 2026",
    actions: ["Edit", "Duplicate", "Publish"],
    isLink: false,
  },
]

type StatusType = "Active" | "Draft"

const statusConfig: Record<StatusType, { bg: string; text: string; dot: string }> = {
  Active: {
    bg: "#DCFCE7",
    text: "#15803D",
    dot: "#16A34A",
  },
  Draft: {
    bg: "#FEF3C7",
    text: "#92400E",
    dot: "#F59E0B",
  },
}

function StatusPill({ status }: { status: StatusType }) {
  const cfg = statusConfig[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: cfg.dot }}
      />
      {status}
    </span>
  )
}

export function Screen1AttributeProfiles({ onNavigateToProfile }: Screen1Props) {
  return (
    <div className="flex flex-col gap-6 p-8 max-w-7xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#111827] text-balance">
          Retailer Attribute Profiles
        </h1>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "#6B7280" }}>
          Define which attributes your suppliers must populate by product category.
          Suppliers see these requirements when uploading GTINs.
        </p>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-end gap-3">
        <button
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium border transition-colors hover:bg-[#F4F6F8]"
          style={{ borderColor: "#E0E4E8", color: "#6B7280" }}
        >
          <Upload className="w-3.5 h-3.5" />
          Import from CSV
        </button>
        <button
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: "#0168B3" }}
        >
          <Plus className="w-3.5 h-3.5" />
          Create New Profile
        </button>
      </div>

      {/* Table */}
      <div
        className="rounded-lg border bg-white overflow-hidden"
        style={{ borderColor: "#E0E4E8" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #E0E4E8", backgroundColor: "#F4F6F8" }}>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280] w-[26%]">
                Profile Name
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280] w-[16%]">
                Category
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280] w-[14%]">
                Attributes Required
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280] w-[10%]">
                Status
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280] w-[14%]">
                Last Updated
              </th>
              <th className="text-left px-4 py-3 font-medium text-[#6B7280]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile, idx) => (
              <tr
                key={profile.name}
                style={{
                  borderBottom: idx < profiles.length - 1 ? "1px solid #E0E4E8" : undefined,
                }}
                className="hover:bg-[#F4F6F8]/50 transition-colors"
              >
                <td className="px-4 py-3.5">
                  {profile.isLink ? (
                    <button
                      onClick={onNavigateToProfile}
                      className="font-medium hover:underline text-left cursor-pointer"
                      style={{ color: "#0168B3" }}
                    >
                      {profile.name}
                    </button>
                  ) : (
                    <span className="font-medium" style={{ color: "#0168B3" }}>
                      {profile.name}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-[#111827]">{profile.category}</td>
                <td className="px-4 py-3.5 text-[#111827]">{profile.attributes}</td>
                <td className="px-4 py-3.5">
                  <StatusPill status={profile.status} />
                </td>
                <td className="px-4 py-3.5 text-[#6B7280]">{profile.lastUpdated}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    {profile.actions.map((action, i) => (
                      <span key={action} className="flex items-center gap-3">
                        <button
                          className="text-[#6B7280] hover:text-[#111827] transition-colors cursor-pointer"
                        >
                          {action}
                        </button>
                        {i < profile.actions.length - 1 && (
                          <span className="text-[#E0E4E8]">·</span>
                        )}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info callout */}
      <div
        className="flex items-start gap-3 p-4 rounded-md text-sm leading-relaxed"
        style={{
          backgroundColor: "#EFF6FF",
          borderLeft: "4px solid #0168B3",
          color: "#374151",
        }}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#0168B3" }} />
        <p>
          <span className="font-medium text-[#111827]">Active profiles</span> are visible to
          all suppliers trading under your retailer account.{" "}
          <span className="font-medium text-[#111827]">Draft profiles</span> are not visible
          to suppliers until published.
        </p>
      </div>
    </div>
  )
}
