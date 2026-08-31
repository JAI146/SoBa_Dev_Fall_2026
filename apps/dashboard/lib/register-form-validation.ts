import {
  ClientType,
  registerSchema,
  type RegisterInput,
} from "@purposemint/contracts";

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
};

export function validateRegisterForm(values: RegisterFormValues) {
  const result = registerSchema.safeParse(buildRegisterInput(values));
  const errors = result.success
    ? []
    : result.error.issues.map((issue) => issue.message);
  if (values.password !== values.confirmPassword) {
    errors.push("Passwords do not match.");
  }

  return { isComplete: errors.length === 0, errors };
}

export function buildRegisterInput(values: RegisterFormValues): RegisterInput {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
    password: values.password,
    ...(values.country.trim() ? { country: values.country } : {}),
    ...(values.state.trim() ? { state: values.state } : {}),
    ...(values.city.trim() ? { city: values.city } : {}),
    agreeTermsOfUse: values.agreeTermsOfUse,
    agreePrivacyPolicy: values.agreePrivacyPolicy,
    policyVersion: "1.0",
    clientType: ClientType.DASHBOARD,
  };
}
