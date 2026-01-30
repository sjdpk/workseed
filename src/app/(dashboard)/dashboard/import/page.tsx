"use client";

import { useState, useRef } from "react";
import { Button, Card, Select, useToast } from "@/components";

type ImportType = "users" | "leave-allocations" | "departments" | "teams" | "branches";

interface ImportResult {
  success: boolean;
  row: number;
  error?: string;
  email?: string;
  employeeId?: string;
  code?: string;
  name?: string;
  leaveType?: string;
}

interface ImportResponse {
  success: boolean;
  error?: string;
  data?: {
    dryRun?: boolean;
    total: number;
    valid?: number;
    invalid?: number;
    successful?: number;
    failed?: number;
    errors?: ImportResult[];
    results?: ImportResult[];
    preview?: Record<string, unknown>[];
  };
}

const IMPORT_TYPES = [
  { value: "users", label: "Users / Employees" },
  { value: "leave-allocations", label: "Leave Allocations" },
  { value: "departments", label: "Departments" },
  { value: "teams", label: "Teams" },
  { value: "branches", label: "Branches" },
];

const CSV_TEMPLATES: Record<ImportType, { headers: string[]; example: string[] }> = {
  users: {
    headers: ["email", "password", "firstName", "lastName", "employeeId", "phone", "role", "status", "designation", "employmentType", "joiningDate", "departmentCode", "teamCode", "branchCode"],
    example: ["john@example.com", "Welcome@123", "John", "Doe", "EMP001", "+1234567890", "EMPLOYEE", "ACTIVE", "Software Engineer", "FULL_TIME", "2024-01-15", "ENG", "DEV", "HQ"],
  },
  "leave-allocations": {
    headers: ["employeeId", "leaveTypeCode", "year", "allocated", "carriedOver", "adjusted", "notes"],
    example: ["EMP001", "AL", "2024", "20", "5", "0", "Annual allocation"],
  },
  departments: {
    headers: ["code", "name", "description", "branchCode", "headEmployeeId", "isActive"],
    example: ["ENG", "Engineering", "Software Engineering Department", "HQ", "EMP001", "true"],
  },
  teams: {
    headers: ["code", "name", "description", "departmentCode", "leadEmployeeId", "isActive"],
    example: ["DEV", "Development", "Development Team", "ENG", "EMP002", "true"],
  },
  branches: {
    headers: ["code", "name", "address", "city", "state", "country", "phone", "email", "isActive"],
    example: ["HQ", "Headquarters", "123 Main St", "New York", "NY", "USA", "+1234567890", "hq@company.com", "true"],
  },
};

export default function ImportPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<ImportType>("users");
  const [csvData, setCsvData] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<ImportResponse["data"] | null>(null);
  const [importResult, setImportResult] = useState<ImportResponse["data"] | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvData(text);
      setValidationResult(null);
      setImportResult(null);
    };
    reader.readAsText(file);
  };

  const handleValidate = async () => {
    if (!csvData) {
      toast.error("Please upload a CSV file first");
      return;
    }

    setValidating(true);
    setValidationResult(null);
    setImportResult(null);

    try {
      const res = await fetch(`/api/import/${importType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvData, dryRun: true }),
      });

      const data: ImportResponse = await res.json();

      if (!data.success) {
        toast.error(data.error || "Validation failed");
        return;
      }

      setValidationResult(data.data || null);
      if (data.data?.invalid === 0) {
        toast.success(`All ${data.data.valid} rows are valid`);
      } else {
        toast.warning(`${data.data?.valid || 0} valid, ${data.data?.invalid || 0} invalid rows`);
      }
    } catch {
      toast.error("Validation failed");
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!csvData) {
      toast.error("Please upload a CSV file first");
      return;
    }

    if (!validationResult) {
      toast.error("Please validate the data first");
      return;
    }

    if (validationResult.valid === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setLoading(true);
    setImportResult(null);

    try {
      const res = await fetch(`/api/import/${importType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvData, dryRun: false }),
      });

      const data: ImportResponse = await res.json();

      if (!data.success) {
        toast.error(data.error || "Import failed");
        return;
      }

      setImportResult(data.data || null);
      toast.success(`Successfully imported ${data.data?.successful || 0} records`);

      // Reset form
      setCsvData("");
      setFileName("");
      setValidationResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      toast.error("Import failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = CSV_TEMPLATES[importType];
    const csvContent = [template.headers.join(","), template.example.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${importType}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setCsvData("");
    setFileName("");
    setValidationResult(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Import Data</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Bulk import data from CSV files
        </p>
      </div>

      <Card>
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Select
                id="importType"
                label="Import Type"
                options={IMPORT_TYPES}
                value={importType}
                onChange={(e) => {
                  setImportType(e.target.value as ImportType);
                  resetForm();
                }}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={downloadTemplate}>
                Download Template
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload CSV File
            </label>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 dark:text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  dark:file:bg-blue-900/20 dark:file:text-blue-400
                  dark:hover:file:bg-blue-900/30"
              />
            </div>
            {fileName && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Selected: {fileName}
              </p>
            )}
          </div>

          {csvData && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CSV Preview (first 5 rows)
              </label>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <pre className="p-4 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {csvData.split("\n").slice(0, 6).join("\n")}
                </pre>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleValidate}
              disabled={!csvData || validating || loading}
            >
              {validating ? "Validating..." : "Validate"}
            </Button>
            <Button
              onClick={handleImport}
              disabled={!csvData || !validationResult || validationResult.valid === 0 || loading}
            >
              {loading ? "Importing..." : "Import"}
            </Button>
            {(csvData || validationResult || importResult) && (
              <Button variant="outline" onClick={resetForm}>
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {validationResult && (
        <Card>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            Validation Results
          </h2>
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Rows</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{validationResult.total}</p>
            </div>
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4">
              <p className="text-sm text-green-600 dark:text-green-400">Valid</p>
              <p className="text-2xl font-semibold text-green-700 dark:text-green-300">{validationResult.valid}</p>
            </div>
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-600 dark:text-red-400">Invalid</p>
              <p className="text-2xl font-semibold text-red-700 dark:text-red-300">{validationResult.invalid}</p>
            </div>
          </div>

          {validationResult.errors && validationResult.errors.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Errors</h3>
              <div className="max-h-60 overflow-y-auto rounded-lg border border-red-200 dark:border-red-800">
                <table className="min-w-full divide-y divide-red-200 dark:divide-red-800">
                  <thead className="bg-red-50 dark:bg-red-900/20">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-red-600 dark:text-red-400">Row</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-red-600 dark:text-red-400">Identifier</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-red-600 dark:text-red-400">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 dark:divide-red-800/50">
                    {validationResult.errors.map((err, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{err.row}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                          {err.email || err.employeeId || err.code || "-"}
                        </td>
                        <td className="px-4 py-2 text-sm text-red-600 dark:text-red-400">{err.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {validationResult.preview && validationResult.preview.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preview (first 10 valid rows)
              </h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {Object.keys(validationResult.preview[0]).map((key) => (
                        <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {validationResult.preview.map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((val, vidx) => (
                          <td key={vidx} className="px-4 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                            {String(val ?? "-")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      {importResult && (
        <Card>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            Import Results
          </h2>
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{importResult.total}</p>
            </div>
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4">
              <p className="text-sm text-green-600 dark:text-green-400">Successful</p>
              <p className="text-2xl font-semibold text-green-700 dark:text-green-300">{importResult.successful}</p>
            </div>
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-600 dark:text-red-400">Failed</p>
              <p className="text-2xl font-semibold text-red-700 dark:text-red-300">{importResult.failed}</p>
            </div>
          </div>

          {importResult.results && importResult.results.filter((r) => !r.success).length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">Failed Imports</h3>
              <div className="max-h-60 overflow-y-auto rounded-lg border border-red-200 dark:border-red-800">
                <table className="min-w-full divide-y divide-red-200 dark:divide-red-800">
                  <thead className="bg-red-50 dark:bg-red-900/20">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-red-600 dark:text-red-400">Row</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-red-600 dark:text-red-400">Identifier</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-red-600 dark:text-red-400">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-100 dark:divide-red-800/50">
                    {importResult.results.filter((r) => !r.success).map((err, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{err.row}</td>
                        <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                          {err.email || err.employeeId || err.code || "-"}
                        </td>
                        <td className="px-4 py-2 text-sm text-red-600 dark:text-red-400">{err.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          CSV Format Guide
        </h2>
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
          {importType === "users" && (
            <>
              <p><strong>Required columns:</strong> email, firstName, lastName</p>
              <p><strong>Optional columns:</strong> password (default: Welcome@123), employeeId (auto-generated if empty), phone, role (ADMIN/HR/MANAGER/TEAM_LEAD/EMPLOYEE), status (ACTIVE/INACTIVE/SUSPENDED), designation, employmentType (FULL_TIME/PART_TIME/CONTRACT/INTERN), joiningDate, departmentCode, teamCode, branchCode</p>
              <p><strong>Note:</strong> Department, team, and branch can be specified by code or name.</p>
            </>
          )}
          {importType === "leave-allocations" && (
            <>
              <p><strong>Required columns:</strong> employeeId, leaveTypeCode, allocated</p>
              <p><strong>Optional columns:</strong> year (default: current year), carriedOver, adjusted, notes</p>
              <p><strong>Note:</strong> Leave type can be specified by code or name. If allocation exists, it will be updated.</p>
            </>
          )}
          {importType === "departments" && (
            <>
              <p><strong>Required columns:</strong> code, name</p>
              <p><strong>Optional columns:</strong> description, branchCode, headEmployeeId, isActive</p>
            </>
          )}
          {importType === "teams" && (
            <>
              <p><strong>Required columns:</strong> code, name, departmentCode</p>
              <p><strong>Optional columns:</strong> description, leadEmployeeId, isActive</p>
            </>
          )}
          {importType === "branches" && (
            <>
              <p><strong>Required columns:</strong> code, name</p>
              <p><strong>Optional columns:</strong> address, city, state, country, phone, email, isActive</p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
