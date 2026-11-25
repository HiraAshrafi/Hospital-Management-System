"use client";

import { Check, Eye, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  RequestStatusBadge,
  ReviewHospitalRequestModal,
  type RequestDecision,
} from "@/components/hospitals/HospitalRequestReview";
import { HospitalDetailModal } from "@/components/hospitals/HospitalDetailModal";
import { Alert, Badge, Button, Card, Input, Pagination, Select, Spinner } from "@/components/ui";
import { api, buildQuery, errorMessage, formatDate } from "@/lib/api";
import { REQUEST_TYPE_LABEL } from "@/lib/hospitals";
import type { HospitalRequest, Paginated } from "@/lib/types";

const PAGE_SIZE = 10;

const STATUS_TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "", label: "All" },
];

export default function HospitalRequestsPage() {
  const [data, setData] = useState<Paginated<HospitalRequest> | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("pending");
  const [type, setType] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [review, setReview] = useState<{ hospitalRequest: HospitalRequest; decision: RequestDecision } | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    const query = buildQuery({ page, page_size: PAGE_SIZE, search, status, type });
    api<Paginated<HospitalRequest>>(`/hospital-requests/${query}`)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError("");
        }
      })
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [page, search, status, type, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-primary to-primary-hover p-6 text-white shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white/75">Review &amp; verify</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Hospital requests</h2>
          <p className="mt-1 text-sm text-white/80">Approve facility submissions and assign hospital managers.</p>
        </div>
        {data && <p className="text-sm text-white/80">{data.count.toLocaleString()} matching requests</p>}
      </div>

      <Card className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="inline-flex w-fit rounded-lg border border-border bg-background p-1" role="tablist" aria-label="Request status">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.label}
              role="tab"
              aria-selected={status === tab.value}
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                status === tab.value ? "bg-primary text-white" : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              placeholder="Search hospital, requester, or email"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="sm:w-52" aria-label="Request type">
            <option value="">All types</option>
            <option value="manager">Manager request</option>
            <option value="new_hospital">New hospital</option>
          </Select>
        </div>
      </Card>

      {error && <Alert>{error}</Alert>}

      <Card className="overflow-hidden">
        {!data ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] table-fixed text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Hospital</th>
                    <th className="w-[220px] px-5 py-3 font-medium">Requested by</th>
                    <th className="w-[150px] px-5 py-3 font-medium">Type</th>
                    <th className="w-[130px] px-5 py-3 font-medium">Submitted</th>
                    <th className="w-[160px] px-5 py-3 font-medium">Status</th>
                    <th className="w-[230px] px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.results.map((request) => (
                    <tr key={request.id} className="hover:bg-background/60">
                      <td className="px-5 py-3">
                        <button className="block max-w-full truncate text-left font-medium hover:text-primary" onClick={() => setViewingId(request.hospital.id)}>
                          {request.hospital.name}
                        </button>
                        <p className="truncate text-xs text-muted">{request.hospital.address || "No address"}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="truncate font-medium">{request.claimant_name}</p>
                        <p className="truncate text-xs text-muted">{request.user?.email ?? "Account deleted"}</p>
                      </td>
                      <td className="px-5 py-3">
                        {request.type === "new_hospital" ? <Badge tone="primary">{REQUEST_TYPE_LABEL[request.type]}</Badge> : <span className="text-muted">{REQUEST_TYPE_LABEL[request.type]}</span>}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDate(request.created_at)}</td>
                      <td className="px-5 py-3">
                        <RequestStatusBadge status={request.status} />
                        {request.reviewed_by && (
                          <p className="mt-1 truncate text-xs text-muted" title={request.admin_note || undefined}>
                            by {request.reviewed_by.full_name || request.reviewed_by.email}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" className="px-2 py-1.5" title="View hospital" onClick={() => setViewingId(request.hospital.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {request.status === "pending" && (
                            <>
                              <Button variant="secondary" className="px-3 py-1.5 text-success" onClick={() => setReview({ hospitalRequest: request, decision: "approve" })}>
                                <Check className="h-4 w-4" /> Approve
                              </Button>
                              <Button variant="ghost" className="px-2 py-1.5 hover:text-danger" title="Reject" onClick={() => setReview({ hospitalRequest: request, decision: "reject" })}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data.results.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-14 text-center text-muted">
                        {status === "pending" ? "No hospital requests waiting for review" : "No hospital requests found"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} count={data.count} onChange={setPage} />
          </>
        )}
      </Card>

      {review && (
        <ReviewHospitalRequestModal
          hospitalRequest={review.hospitalRequest}
          decision={review.decision}
          onClose={() => setReview(null)}
          onDone={() => {
            setReview(null);
            if (data && data.results.length === 1 && page > 1 && status === "pending") setPage(page - 1);
            else reload();
          }}
        />
      )}

      {viewingId !== null && (
        <HospitalDetailModal key={viewingId} hospitalId={viewingId} onClose={() => setViewingId(null)} onChanged={reload} />
      )}
    </div>
  );
}
