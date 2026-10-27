import * as yup from 'yup';


export const registerSchema = yup.object({
  fullName: yup
    .string()
    .trim()
    .required("Full Name is required")
    .min(3, "Full Name must contain at least 3 characters")
    .max(100, "Full Name cannot exceed 100 characters")
    .matches(
      /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u,
      "Full Name must contain valid letters only"
    ),

  userName: yup
    .string()
    .trim()
    .required("Username is required")
    .min(3, "Username must contain at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .matches(
      /^[a-zA-Z0-9._]+$/,
      "Username can only contain letters, numbers, dots and underscores"
    ),

  email: yup
    .string()
    .trim()
    .required("Email is required")
    .email("Please enter a valid email address")
    .max(254, "Email address is too long"),

  password: yup
    .string()
    .required("Password is required")
    .min(8, "Password must contain at least 8 characters")
    .max(128, "Password cannot exceed 128 characters")
    .matches(
      /[A-Z]/,
      "Password must contain at least one uppercase letter"
    )
    .matches(
      /[a-z]/,
      "Password must contain at least one lowercase letter"
    )
    .matches(
      /[0-9]/,
      "Password must contain at least one number"
    )
    .matches(
      /[^A-Za-z0-9\s]/,
      "Password must contain at least one special character"
    ),

  confirmPassword: yup
    .string()
    .required("Confirm Password is required")
    .oneOf(
      [yup.ref("password")],
      "Passwords do not match"
    ),

  phoneNumber: yup
    .string()
    .required("Phone Number is required")
    .matches(
      /^05\d{8}$/,
      "Phone Number must start with 05 and contain exactly 10 digits"
    ),

  gender: yup
    .string()
    .required("Gender is required")
    .oneOf(
      ["Male", "Female"],
      "Please select a valid gender"
    ),

  age: yup
    .number()
    .typeError("Age must be a valid number")
    .required("Age is required")
    .integer("Age must be a whole number")
    .min(0, "Age cannot be negative")
    .max(120, "Please enter a valid age"),

  height: yup
    .number()
    .typeError("Height must be a valid number")
    .required("Height is required")
    .positive("Height must be greater than zero")
    .min(50, "Height must be at least 50 cm")
    .max(250, "Height cannot exceed 250 cm"),

  weight: yup
    .number()
    .typeError("Weight must be a valid number")
    .required("Weight is required")
    .positive("Weight must be greater than zero")
    .min(2, "Weight must be at least 2 kg")
    .max(400, "Weight cannot exceed 400 kg"),


  dateOfBirth: yup
    .string()
    .required("Date of Birth is required")
    .test(
      "valid-date",
      "Please enter a valid Date of Birth",
      (value) => {
        if (!value) return false;

        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return false;
        }

        const [year, month, day] = value.split("-").map(Number);

        const birthDate = new Date(year, month - 1, day);

        const isValidDate =
          birthDate.getFullYear() === year &&
          birthDate.getMonth() === month - 1 &&
          birthDate.getDate() === day;

        if (!isValidDate) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Prevent future dates
        if (birthDate > today) {
          return false;
        }

        // Calculate the maximum allowed age
        const oldestAllowedDate = new Date(today);
        oldestAllowedDate.setFullYear(
          today.getFullYear() - 120
        );

        // Prevent dates older than 120 years
        if (birthDate < oldestAllowedDate) {
          return false;
        }

        return true;
      }
    ),
  city: yup
    .string()
    .trim()
    .required("City is required")
    .min(2, "City must contain at least 2 characters")
    .max(100, "City cannot exceed 100 characters"),
});


export const loginSchema = yup.object({
  email: yup
    .string()
    .required("Email is Required")
    .email("Invalid Email Format"),
  password: yup.string().required("Password is Required"),
});

export const sendSchema = yup.object({
  email: yup
    .string()
    .required("Email is Required")
    .email("Invalid Email Format"),
});

export const resetSchema = yup.object({
  newPassword: yup
    .string()
    .required("Password is Required")
    .min(6, "Password must have at least 6 chars")
    .matches(/[A-Z]/, "Password must contains uppercase letter")
    .matches(/[a-z]/, "Password must contains lowercase letter")
    .matches(/[0-9]/, "Password must contains number"),
  code: yup.string().required("Code is Required check your Email"),
  email: yup
    .string()
    .required("Email is Required")
    .email("Invalid Email Format"),
});

export const docregisterSchema = yup.object({
  fullName: yup
    .string()
    .required("Full Name is Required")
    .min(3, "Full Name must have at least 3 Chars"),
  userName: yup
    .string()
    .required("User Name is Required")
    .min(3, "User Name must have at least 3 Chars"),
  email: yup
    .string()
    .required("Email is Required")
    .email("Invalid Email Format"),
  password: yup
    .string()
    .required("Password is Required")
    .min(8, "Password must have at least 8 chars")
    .matches(/[A-Z]/, "Password must contain uppercase letter")
    .matches(/[a-z]/, "Password must contain lowercase letter")
    .matches(/[0-9]/, "Password must contain number")
    .matches(/[!@#$%^&*(),.?":{}|<>_\-+=]/, "Password must contain a special character"),
  confirmPassword: yup
    .string()
    .required("Confirm Password is Required")
    .oneOf([yup.ref("password")], "Passwords must match"),
  specialization: yup
    .string()
    .trim()
    .required("specialization is Required"),
  certificate: yup
    .string()
    .trim()
    .required("certificate is Required"),
  dateOfBirth: yup.string().required("Date of Birth is required"),
  gender: yup.string().required("Gender is required"),
});
