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
  const errors: string[] = [];
  if (!values.firstName.trim()) errors.push("First name is required.");
  if (!values.lastName.trim()) errors.push("Last name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.push("Enter a valid email address.");
  }
  if (values.password.length < 8) {
    errors.push("Password must contain at least 8 characters.");
  }
  if (values.password !== values.confirmPassword) {
    errors.push("Passwords do not match.");
  }
  if (!values.country) errors.push("Country is required.");
  if (!values.agreeTermsOfUse) errors.push("Accept the Terms of Use.");
  if (!values.agreePrivacyPolicy) errors.push("Accept the Privacy Policy.");

  return { isComplete: errors.length === 0, errors };
}

export function buildRegisterFormData(
  values: RegisterFormValues,
  profileImage?: File,
) {
  const formData = new FormData();
  formData.append("firstName", values.firstName.trim());
  formData.append("lastName", values.lastName.trim());
  formData.append("email", values.email.trim());
  formData.append("password", values.password);
  formData.append("confirmPassword", values.confirmPassword);
  formData.append("country", values.country);
  if (values.state) formData.append("state", values.state);
  if (values.city) formData.append("city", values.city);
  formData.append("agreeTermsOfUse", "on");
  formData.append("agreePrivacyPolicy", "on");
  if (profileImage) formData.append("profileImage", profileImage);
  return formData;
}
