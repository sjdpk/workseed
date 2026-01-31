"use client";

import { useEffect, useState } from "react";

interface EmployeeRequest {
  id: string;
  type: "ASSET" | "DOCUMENT" | "GENERAL";
  subject: string;
  description: string;
  priority: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  assetCategory: string | null;
  documentType: string | null;
  response: string | null;
  createdAt: string;
  approvedAt: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department: { name: string } | null;
  };
  approver: { firstName: string; lastName: string } | null;
}

interface UserInfo {
  id: string;
  role: string;
  firstName: string;
  lastName: string;
}

export default function RequestsPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<EmployeeRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [form, setForm] = useState({
    type: "GENERAL",
    subject: "",
    description: "",
    priority: "NORMAL",
    assetCategory: "",
    documentType: "",
  });
  const [responseText, setResponseText] = useState("");

  const isAdminOrHR = user?.role === "ADMIN" || user?.role === "HR";

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setUser(data.data.user);
      });
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [filterStatus, filterType]);

  const fetchRequests = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.append("status", filterStatus);
    if (filterType) params.append("type", filterType);
    const res = await fetch(`/api/requests?${params}`);
    const data = await res.json();
    if (data.success) {
      setRequests(data.data.requests);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowModal(false);
      setForm({ type: "GENERAL", subject: "", description: "", priority: "NORMAL", assetCategory: "", documentType: "" });
      fetchRequests();
    }
  };

  const handleAction = async (id: string, status: string) => {
    const res = await fetch(`/api/requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, response: responseText }),
    });
    if (res.ok) {
      setSelectedRequest(null);
      setResponseText("");
      fetchRequests();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "APPROVED":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "REJECTED":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "CANCELLED":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "ASSET":
        return <AssetIcon className="h-4 w-4" />;
      case "DOCUMENT":
        return <DocumentIcon className="h-4 w-4" />;
      default:
        return <QuestionIcon className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "text-red-600 dark:text-red-400";
      case "HIGH":
        return "text-orange-600 dark:text-orange-400";
      default:
        return "text-gray-500 dark:text-gray-400";
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isAdminOrHR ? "Employee Requests" : "My Requests"}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {isAdminOrHR ? "Manage employee service requests" : "Submit and track your requests"}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
        >
          New Request
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <option value="">All Types</option>
          <option value="ASSET">Asset Request</option>
          <option value="DOCUMENT">Document Request</option>
          <option value="GENERAL">General Request</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent dark:border-white" />
        </div>
      ) : requests.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <InboxIcon className="h-6 w-6 text-gray-400" />
          </div>
          <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">No requests yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Click "New Request" to submit your first request</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => (
            <button
              key={req.id}
              onClick={() => setSelectedRequest(req)}
              className="flex w-full items-center gap-4 rounded-md border border-gray-200 px-4 py-3 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800/50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {getTypeIcon(req.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{req.subject}</p>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${getStatusColor(req.status)}`}>
                    {req.status.charAt(0) + req.status.slice(1).toLowerCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isAdminOrHR && `${req.user.firstName} ${req.user.lastName} · `}
                  {req.type} · {new Date(req.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className={`text-xs font-medium ${getPriorityColor(req.priority)}`}>
                {req.priority !== "NORMAL" && req.priority}
              </span>
              <ChevronRightIcon className="h-4 w-4 text-gray-300 dark:text-gray-600" />
            </button>
          ))}
        </div>
      )}

      {/* New Request Sidebar */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowModal(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl dark:bg-gray-900">
            <form onSubmit={handleSubmit} className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">New Request</h2>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-5">
                {/* Request Type Selection */}
                <div className="mb-6">
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    What do you need?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "ASSET", label: "Asset", icon: AssetIcon, desc: "Equipment" },
                      { value: "DOCUMENT", label: "Document", icon: DocumentIcon, desc: "Letters" },
                      { value: "GENERAL", label: "General", icon: QuestionIcon, desc: "Other" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setForm({ ...form, type: option.value })}
                        className={`flex flex-col items-center rounded-md border-2 p-3 transition-all ${
                          form.type === option.value
                            ? "border-gray-900 bg-gray-50 dark:border-white dark:bg-gray-800"
                            : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
                        }`}
                      >
                        <option.icon className={`h-5 w-5 ${form.type === option.value ? "text-gray-900 dark:text-white" : "text-gray-400"}`} />
                        <span className={`mt-1.5 text-xs font-medium ${form.type === option.value ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"}`}>
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Asset Category */}
                {form.type === "ASSET" && (
                  <div className="mb-5">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Asset Category
                    </label>
                    <select
                      value={form.assetCategory}
                      onChange={(e) => setForm({ ...form, assetCategory: e.target.value })}
                      className="w-full rounded-md border-0 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900 dark:bg-gray-800 dark:text-white dark:focus:ring-white"
                    >
                      <option value="">Select category</option>
                      <option value="LAPTOP">Laptop</option>
                      <option value="DESKTOP">Desktop</option>
                      <option value="MOBILE">Mobile</option>
                      <option value="MONITOR">Monitor</option>
                      <option value="KEYBOARD">Keyboard</option>
                      <option value="MOUSE">Mouse</option>
                      <option value="HEADSET">Headset</option>
                      <option value="SOFTWARE_LICENSE">Software License</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                )}

                {/* Document Type */}
                {form.type === "DOCUMENT" && (
                  <div className="mb-5">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Document Type
                    </label>
                    <select
                      value={form.documentType}
                      onChange={(e) => setForm({ ...form, documentType: e.target.value })}
                      className="w-full rounded-md border-0 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900 dark:bg-gray-800 dark:text-white dark:focus:ring-white"
                    >
                      <option value="">Select type</option>
                      <option value="SALARY_SLIP">Salary Slip</option>
                      <option value="EMPLOYMENT_LETTER">Employment Letter</option>
                      <option value="EXPERIENCE_LETTER">Experience Letter</option>
                      <option value="BONAFIDE_LETTER">Bonafide Letter</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                )}

                {/* Subject */}
                <div className="mb-5">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Subject
                  </label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full rounded-md border-0 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-gray-900 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 dark:focus:ring-white"
                    placeholder="Brief subject of your request"
                  />
                </div>

                {/* Description */}
                <div className="mb-5">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full resize-none rounded-md border-0 bg-gray-100 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-gray-900 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 dark:focus:ring-white"
                    placeholder="Provide details about your request..."
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Priority
                  </label>
                  <div className="flex gap-2">
                    {[
                      { value: "LOW", label: "Low", color: "text-gray-500" },
                      { value: "NORMAL", label: "Normal", color: "text-blue-600" },
                      { value: "HIGH", label: "High", color: "text-orange-600" },
                      { value: "URGENT", label: "Urgent", color: "text-red-600" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setForm({ ...form, priority: option.value })}
                        className={`flex-1 rounded-md py-2 text-xs font-medium transition-all ${
                          form.priority === option.value
                            ? `${option.color} bg-gray-100 ring-1 ring-current dark:bg-gray-800`
                            : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 px-5 py-4 dark:border-gray-800">
                <button
                  type="submit"
                  className="w-full rounded-md bg-gray-900 py-2.5 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Detail Sidebar */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelectedRequest(null)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl dark:bg-gray-900">
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${getStatusColor(selectedRequest.status)}`}>
                  {selectedRequest.status.charAt(0) + selectedRequest.status.slice(1).toLowerCase()}
                </span>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedRequest.subject}
                </h2>

                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Type:</span>
                    <span>{selectedRequest.type}</span>
                    {selectedRequest.assetCategory && <span>({selectedRequest.assetCategory})</span>}
                    {selectedRequest.documentType && <span>({selectedRequest.documentType})</span>}
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Priority:</span>
                    <span className={getPriorityColor(selectedRequest.priority)}>{selectedRequest.priority}</span>
                  </div>
                  {isAdminOrHR && (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <span className="font-medium">From:</span>
                      <span>{selectedRequest.user.firstName} {selectedRequest.user.lastName} ({selectedRequest.user.employeeId})</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Submitted:</span>
                    <span>{new Date(selectedRequest.createdAt).toLocaleString()}</span>
                  </div>
                  {selectedRequest.approver && (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Handled by:</span>
                      <span>{selectedRequest.approver.firstName} {selectedRequest.approver.lastName}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">
                    {selectedRequest.description}
                  </p>
                </div>

                {selectedRequest.response && (
                  <div className="mt-6 rounded-md bg-gray-50 p-3 dark:bg-gray-800">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Response</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{selectedRequest.response}</p>
                  </div>
                )}

                {/* Actions */}
                {selectedRequest.status === "PENDING" && (
                  <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
                    {isAdminOrHR ? (
                      <>
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Response (optional)
                          </label>
                          <textarea
                            rows={2}
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            placeholder="Add a response or note"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(selectedRequest.id, "APPROVED")}
                            className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(selectedRequest.id, "REJECTED")}
                            className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      </>
                    ) : (
                      selectedRequest.user.id === user?.id && (
                        <button
                          onClick={() => handleAction(selectedRequest.id, "CANCELLED")}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                        >
                          Cancel Request
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-17.5 0V6.75A2.25 2.25 0 014.5 4.5h15a2.25 2.25 0 012.25 2.25v6.75m-17.5 0v4.5a2.25 2.25 0 002.25 2.25h13a2.25 2.25 0 002.25-2.25v-4.5" />
    </svg>
  );
}

function AssetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function QuestionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}
