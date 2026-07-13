import { registerSchema } from "@muakhah/contracts";

export type RegisterFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  country: string;
  state: string;
  city: string;
  agreeTermsOfUse: boolean;
  agreePrivacyPolicy: boolean;
  agreeDirectSponsorshipPolicy: boolean;
  agreeCommunicationPolicy: boolean;
};

export const emptyRegisterFormValues: RegisterFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  country: "",
  state: "",
  city: "",
  agreeTermsOfUse: false,
  agreePrivacyPolicy: false,
  agreeDirectSponsorshipPolicy: false,
  agreeCommunicationPolicy: false,
};

const FIELD_MESSAGE_KEYS: Record<string, string> = {
  firstName: "auth.register.validation.firstName",
  lastName: "auth.register.validation.lastName",
  email: "auth.register.validation.email",
  password: "auth.register.validation.password",
  confirmPassword: "auth.register.validation.confirmPassword",
  country: "auth.register.validation.country",
  agreeTermsOfUse: "auth.register.validation.agreeTermsOfUse",
  agreePrivacyPolicy: "auth.register.validation.agreePrivacyPolicy",
  agreeDirectSponsorshipPolicy: "auth.register.validation.agreeDirectSponsorshipPolicy",
  agreeCommunicationPolicy: "auth.register.validation.agreeCommunicationPolicy",
};

function toSchemaPayload(values: RegisterFormValues) {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim(),
    password: values.password,
    confirmPassword: values.confirmPassword,
    country: values.country,
    state: values.state || undefined,
    city: values.city || undefined,
    agreeTermsOfUse: values.agreeTermsOfUse ? "on" : "",
    agreePrivacyPolicy: values.agreePrivacyPolicy ? "on" : "",
    agreeDirectSponsorshipPolicy: values.agreeDirectSponsorshipPolicy ? "on" : "",
    agreeCommunicationPolicy: values.agreeCommunicationPolicy ? "on" : "",
  };
}

export function validateRegisterForm(
  values: RegisterFormValues,
  translate: (key: string) => string,
) {
  const parsed = registerSchema.safeParse(toSchemaPayload(values));
  if (parsed.success) {
    return { isComplete: true, errors: [] as string[] };
  }

  const errors: string[] = [];
  for (const issue of parsed.error.errors) {
    const field = String(issue.path[0] ?? "");
    if (field === "confirmPassword" && issue.message === "Passwords do not match") {
      errors.push(translate("auth.register.validation.passwordMismatch"));
      continue;
    }
    const key = FIELD_MESSAGE_KEYS[field];
    if (key) {
      errors.push(translate(key));
      continue;
    }
    if (issue.message) {
      errors.push(issue.message);
    }
  }

  return { isComplete: false, errors: [...new Set(errors)] };
}

export function buildRegisterFormData(
  values: RegisterFormValues,
  profileImage?: File,
) {
  const formData = new FormData();
  const payload = toSchemaPayload(values);

  formData.append("firstName", payload.firstName);
  formData.append("lastName", payload.lastName);
  formData.append("email", payload.email);
  formData.append("password", payload.password);
  formData.append("confirmPassword", payload.confirmPassword);
  formData.append("country", payload.country);
  if (payload.state) formData.append("state", payload.state);
  if (payload.city) formData.append("city", payload.city);
  formData.append("agreeTermsOfUse", "on");
  formData.append("agreePrivacyPolicy", "on");
  formData.append("agreeDirectSponsorshipPolicy", "on");
  formData.append("agreeCommunicationPolicy", "on");

  if (profileImage) {
    formData.append("profileImage", profileImage);
  }

  return formData;
}
