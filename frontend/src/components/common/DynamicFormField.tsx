import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiErrorMessage } from "../../lib/apiClient";
import { systemService } from "../../services/system.service";

interface DynamicFormFieldProps {
  formCode?: string;
  screenCode?: string;
  roleId: number | null;
  fieldKey: string;
  label: string;
  name: string;
  value?: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "tel" | "url" | "number" | "select" | "textarea";
  min?: number;
  max?: number;
  maxLength?: number;
  step?: number;
  rows?: number;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
  currentUserRole?: boolean;
  onPolicyStateChange?: (fieldKey: string, isLoaded: boolean, hasError: boolean) => void;
}

export function DynamicFormField({
  formCode,
  screenCode,
  roleId,
  fieldKey,
  label,
  name,
  value,
  onChange,
  type = "text",
  min,
  max,
  maxLength,
  step,
  rows = 3,
  required: requiredProp,
  options = [],
  placeholder,
  currentUserRole = false,
  onPolicyStateChange,
}: DynamicFormFieldProps) {
  const effectiveFormCode = screenCode ?? formCode;
  if (!effectiveFormCode) {
    throw new Error("DynamicFormField requires either formCode or screenCode.");
  }
  const [validationError, setValidationError] = useState("");
  const [appliedDefaultKey, setAppliedDefaultKey] = useState<string | null>(null);
  const policyQuery = useQuery({
    queryKey: ["system-field-policies", effectiveFormCode, roleId, currentUserRole],
    queryFn: () => systemService.getFieldPolicies(effectiveFormCode, roleId, currentUserRole),
    retry: false,
  });
  const policy = policyQuery.data?.find((item) => item.fieldKey === fieldKey);

  useEffect(() => {
    onPolicyStateChange?.(fieldKey, policyQuery.isSuccess, policyQuery.isError);
  }, [fieldKey, onPolicyStateChange, policyQuery.isError, policyQuery.isSuccess]);

  const controlId = `${effectiveFormCode}-${fieldKey}`.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const errorId = `${controlId}-error`;
  const required = policy?.isRequired ?? requiredProp ?? false;
  const fieldLabel = policy?.customLabel?.trim() || label;
  const currentValue = value ?? policy?.defaultValue ?? "";
  const helpText = policyQuery.isError
    ? `Không tải được chính sách trường: ${getApiErrorMessage(policyQuery.error)}`
    : policyQuery.isPending
      ? "Đang tải chính sách trường..."
      : null;

  useEffect(() => {
    const defaultKey = `${effectiveFormCode}:${roleId ?? "default"}:${fieldKey}:${policy?.defaultValue ?? ""}`;
    if (value === undefined && policy?.defaultValue && appliedDefaultKey !== defaultKey) {
      setAppliedDefaultKey(defaultKey);
      onChange(policy.defaultValue);
    }
  }, [appliedDefaultKey, effectiveFormCode, fieldKey, onChange, policy?.defaultValue, roleId, value]);

  const validate = () => {
    if (!currentValue && required) {
      setValidationError("Trường này là bắt buộc.");
      return;
    }
    if (type === "number" && currentValue) {
      const numericValue = Number(currentValue);
      if (!Number.isFinite(numericValue) || (min !== undefined && numericValue < min) || (max !== undefined && numericValue > max)) {
        setValidationError(`Giá trị phải nằm trong khoảng ${min ?? "—"} đến ${max ?? "—"}.`);
        return;
      }
    }
    if (!currentValue || !policy?.validationRegex) {
      setValidationError("");
      return;
    }
    try {
      setValidationError(new RegExp(policy.validationRegex).test(currentValue)
        ? ""
        : policy.errorMessage || "Giá trị không đúng định dạng.");
    } catch {
      setValidationError("Quy tắc kiểm tra trường không hợp lệ.");
    }
  };

  if (policy?.isVisible === false) return null;

  const handleChange = (nextValue: string) => {
    onChange(nextValue);
    if (validationError) setValidationError("");
  };
  const controlClass = `min-h-11 w-full rounded-lg border px-3 text-sm text-slate-800 outline-none transition focus:border-[#026aa7] focus:ring-2 focus:ring-[#026aa7]/15 ${
    policy?.isReadOnly ? "cursor-not-allowed bg-slate-100 text-slate-600" : "bg-white"
  } ${validationError ? "border-rose-600" : "border-slate-300"}`;

  return (
    <div className="space-y-1">
      <label htmlFor={controlId} className="block text-xs font-semibold text-slate-700">
        {fieldLabel}{required && <span className="ml-1 text-rose-700" aria-label="bắt buộc">*</span>}
      </label>
      {type === "select" ? (
        <select
          id={controlId}
          name={name}
          value={currentValue}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={validate}
          required={required}
          disabled={policy?.isReadOnly ?? false}
          aria-invalid={Boolean(validationError)}
          aria-describedby={validationError ? errorId : undefined}
          className={controlClass}
        >
          <option value="">Chọn {fieldLabel.toLocaleLowerCase("vi")}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          id={controlId}
          name={name}
          value={currentValue}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={validate}
          placeholder={placeholder}
          required={required}
          readOnly={policy?.isReadOnly ?? false}
          rows={rows}
          maxLength={maxLength}
          aria-invalid={Boolean(validationError)}
          aria-describedby={validationError ? errorId : undefined}
          className={`${controlClass} py-2`}
        />
      ) : (
        <input
          id={controlId}
          name={name}
          type={type}
          min={type === "number" ? min : undefined}
          max={type === "number" ? max : undefined}
          step={type === "number" ? step : undefined}
          maxLength={maxLength}
          value={currentValue}
          onChange={(event) => handleChange(event.target.value)}
          onBlur={validate}
          placeholder={placeholder}
          required={required}
          readOnly={policy?.isReadOnly ?? false}
          pattern={policy?.validationRegex || undefined}
          aria-invalid={Boolean(validationError)}
          aria-describedby={validationError ? errorId : undefined}
          className={controlClass}
        />
      )}
      {validationError ? (
        <p id={errorId} role="alert" className="text-xs text-rose-700">{validationError}</p>
      ) : helpText ? (
        <p role={policyQuery.isError ? "alert" : "status"} className="text-[11px] text-slate-500">{helpText}</p>
      ) : null}
    </div>
  );
}
