
import React, { useRef, useState } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import axios from "axios";

import { resetSchema } from "../../validations/authSchemas";

const colors = {
  primary: "#005c55",
  primaryLight: "#0f766e",
  background: "#f9f9ff",
  surface: "#ffffff",
  field: "#f1f3ff",
  secondary: "#cee5df",
  text: "#041b3c",
  muted: "#3e4947",
  error: "#ba1a1a",
};

function MaterialIcon({ name, sx = {} }) {
  return (
    <Box
      component="span"
      className="material-symbols-outlined"
      aria-hidden="true"
      sx={{
        fontFamily: "Material Symbols Outlined",
        fontSize: 22,
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...sx,
      }}
    >
      {name}
    </Box>
  );
}

const fieldSx = {
  width: "100%",

  "& .MuiOutlinedInput-root": {
    minHeight: 52,
    borderRadius: "12px",
    bgcolor: colors.field,

    "& fieldset": {
      borderColor: "transparent",
    },

    "&:hover fieldset": {
      borderColor: "#bdc9c6",
    },

    "&.Mui-focused": {
      bgcolor: "#fff",

      "& fieldset": {
        borderColor: colors.primaryLight,
        borderWidth: 2,
      },
    },
  },

  "& .MuiInputBase-input": {
    fontSize: 14,
    color: colors.text,
  },

  "& .MuiInputAdornment-root": {
    color: "#6e7977",
  },
};

const passwordRules = [
  {
    label: "8+ characters",
    check: (value) => value.length >= 8,
  },
  {
    label: "Uppercase letter",
    check: (value) => /[A-Z]/.test(value),
  },
  {
    label: "One number",
    check: (value) => /[0-9]/.test(value),
  },
  {
    label: "Special symbol",
    check: (value) => /[^A-Za-z0-9\s]/.test(value),
  },
];

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const otpRefs = useRef([]);

  const [serverError, setServerError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(resetSchema),
    mode: "onBlur",
    defaultValues: {
      email: location.state?.email || "",
      code: "",
      newPassword: "",
    },
  });

  const newPassword = watch("newPassword") || "";

  const onSubmit = async (data) => {
    setServerError(null);

    try {
      await axios.patch(
        "https://chatsystem.runasp.net/api/Account/ResetPassword",
        data
      );

      setSuccess(true);
    } catch (err) {
      console.log(err.response);

      setServerError(
        err.response?.data?.message ||
          "Unable to reset your password. Please verify your code and try again."
      );
    }
  };

  const handleResend = async () => {
    const email = watch("email");

    if (!email || isResending) {
      setResendMessage(
        "Please enter your registered email first."
      );
      return;
    }

    setIsResending(true);
    setResendMessage("");

    try {
      await axios.post(
        "https://chatsystem.runasp.net/api/Account/SendCode",
        { email }
      );

      setResendMessage(
        "A new verification code has been requested."
      );
    } catch (err) {
      console.log(err.response);

      setResendMessage(
        "Unable to resend the code. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: colors.background,
        color: colors.text,
        pb: 5,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Fonts */}
      <Box
        component="style"
        dangerouslySetInnerHTML={{
          __html: `
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Material+Symbols+Outlined&display=swap');
          `,
        }}
      />

      {/* Header */}
      <Box
        sx={{
          bgcolor: "rgba(249,249,255,0.95)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
          px: { xs: 2, sm: 4 },
          py: 1.5,
        }}
      >
        <Box
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <IconButton
              onClick={() => navigate(-1)}
              sx={{ color: colors.muted }}
              aria-label="Go back"
            >
              <MaterialIcon name="arrow_back" />
            </IconButton>

            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 3,
                bgcolor: colors.secondary,
                color: colors.primary,
                display: "grid",
                placeItems: "center",
              }}
            >
              <MaterialIcon name="health_and_safety" />
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize: 19,
                  fontWeight: 800,
                  color: colors.primary,
                  lineHeight: 1.2,
                }}
              >
                SmartDHP
              </Typography>

              <Typography
                sx={{
                  fontSize: 11,
                  color: colors.muted,
                }}
              >
                Reset Password
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: { xs: "none", sm: "flex" },
              alignItems: "center",
              gap: 0.7,
              bgcolor: colors.secondary,
              color: colors.primary,
              px: 1.5,
              py: 0.7,
              borderRadius: "20px",
            }}
          >
            <MaterialIcon
              name="lock"
              sx={{ fontSize: 16 }}
            />

            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              Secure Recovery
            </Typography>
          </Box>
        </Box>
      </Box>

      <Container maxWidth="sm" sx={{ mt: 4 }}>
        {/* Security Badge */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mb: 3,
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.8,
              px: 2,
              py: 0.8,
              borderRadius: "30px",
              bgcolor: colors.secondary,
              color: colors.primary,
            }}
          >
            <MaterialIcon
              name="enhanced_encryption"
              sx={{ fontSize: 17 }}
            />

            <Typography
              sx={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.5,
                textAlign: "center",
              }}
            >
              SECURE PASSWORD RECOVERY
            </Typography>
          </Box>
        </Box>

        {/* Heading */}
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            mb: 3,
          }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              bgcolor: colors.secondary,
              color: colors.primary,
              display: "grid",
              placeItems: "center",
              mb: 2,
            }}
          >
            <MaterialIcon
              name="key_vertical"
              sx={{ fontSize: 30 }}
            />
          </Box>

          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 26, sm: 32 },
              fontWeight: 800,
              mb: 1,
            }}
          >
            Reset Your Password
          </Typography>

          <Typography
            sx={{
              fontSize: 14,
              lineHeight: 1.7,
              color: colors.muted,
              maxWidth: 360,
            }}
          >
            Enter the verification code sent to your email
            and choose a new password.
          </Typography>
        </Box>

        {/* Error */}
        {serverError && (
          <Alert
            severity="error"
            onClose={() => setServerError(null)}
            sx={{
              mb: 2,
              borderRadius: 3,
            }}
          >
            {serverError}
          </Alert>
        )}

        {success ? (
          /* Success State */
          <Paper
            elevation={0}
            sx={{
              borderRadius: "20px",
              p: 4,
              textAlign: "center",
              boxShadow: "0 4px 18px rgba(4,27,60,0.06)",
            }}
          >
            <Box
              sx={{
                width: 70,
                height: 70,
                borderRadius: "50%",
                bgcolor: colors.secondary,
                color: colors.primary,
                display: "grid",
                placeItems: "center",
                mx: "auto",
                mb: 2,
              }}
            >
              <MaterialIcon
                name="task_alt"
                sx={{ fontSize: 42 }}
              />
            </Box>

            <Typography
              sx={{
                fontSize: 22,
                fontWeight: 800,
                mb: 1,
              }}
            >
              Password Reset Successful!
            </Typography>

            <Typography
              sx={{
                fontSize: 14,
                color: colors.muted,
                lineHeight: 1.8,
                mb: 3,
              }}
            >
              Your password has been updated successfully.
              You can now sign in with your new password.
            </Typography>

            <Button
              variant="contained"
              fullWidth
              onClick={() => navigate("/login")}
              sx={{
                height: 52,
                bgcolor: colors.primary,
                borderRadius: 3,
                fontWeight: 700,
                textTransform: "none",

                "&:hover": {
                  bgcolor: colors.primaryLight,
                },
              }}
            >
              Continue to Login
            </Button>
          </Paper>
        ) : (
          /* Reset Form */
          <Paper
            elevation={0}
            sx={{
              width: "100%",
              boxSizing: "border-box",
              bgcolor: colors.surface,
              borderRadius: "20px",
              p: { xs: 2.5, sm: 3.5 },
              boxShadow: "0 4px 18px rgba(4,27,60,0.06)",
            }}
          >
            <Box
              component="form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
            >
              {/* Email */}
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    mb: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Registered Email
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      ml: "auto",
                      color: colors.primary,
                    }}
                  >
                    <MaterialIcon
                      name="lock"
                      sx={{ fontSize: 14 }}
                    />

                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      Encrypted
                    </Typography>
                  </Box>
                </Box>

                <TextField
                  fullWidth
                  type="email"
                  placeholder="name@example.com"
                  {...register("email")}
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  sx={fieldSx}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <MaterialIcon name="mail" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Box>

              {/* OTP Code */}
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    mb: 1.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    5-Digit Verification Code
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 11,
                      color: colors.muted,
                      textAlign: "right",
                    }}
                  >
                    Check your inbox
                  </Typography>
                </Box>

                <Controller
                  name="code"
                  control={control}
                  render={({ field }) => {
                    const code = String(field.value || "");

                    const updateCode = (nextCode) => {
                      field.onChange(nextCode);
                    };

                    const handleDigitChange = (index, value) => {
                      const digit = value.replace(/\D/g, "");

                      if (!digit) {
                        const digits = code
                          .padEnd(5, " ")
                          .split("");

                        digits[index] = " ";

                        updateCode(
                          digits.join("").trimEnd()
                        );

                        return;
                      }

                      const digits = code
                        .padEnd(5, " ")
                        .split("");

                      digits[index] = digit.slice(-1);

                      updateCode(
                        digits.join("").trimEnd()
                      );

                      if (index < 4) {
                        otpRefs.current[index + 1]?.focus();
                      }
                    };

                    const handlePaste = (event) => {
                      const pasted = event.clipboardData
                        .getData("text")
                        .replace(/\D/g, "")
                        .slice(0, 5);

                      if (!pasted) return;

                      event.preventDefault();
                      updateCode(pasted);

                      otpRefs.current[
                        Math.min(pasted.length, 4)
                      ]?.focus();
                    };

                    return (
                      <Box>
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(5, minmax(0, 1fr))",
                            gap: { xs: 1, sm: 1.5 },
                          }}
                        >
                          {Array.from(
                            { length: 5 },
                            (_, index) => (
                              <TextField
                                key={index}
                                inputRef={(element) => {
                                  otpRefs.current[index] =
                                    element;
                                }}
                                value={code[index] || ""}
                                onChange={(event) =>
                                  handleDigitChange(
                                    index,
                                    event.target.value
                                  )
                                }
                                onBlur={field.onBlur}
                                onPaste={handlePaste}
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Backspace" &&
                                    !code[index] &&
                                    index > 0
                                  ) {
                                    otpRefs.current[
                                      index - 1
                                    ]?.focus();
                                  }

                                  if (
                                    event.key === "ArrowLeft" &&
                                    index > 0
                                  ) {
                                    otpRefs.current[
                                      index - 1
                                    ]?.focus();
                                  }

                                  if (
                                    event.key === "ArrowRight" &&
                                    index < 4
                                  ) {
                                    otpRefs.current[
                                      index + 1
                                    ]?.focus();
                                  }
                                }}
                                error={!!errors.code}
                                slotProps={{
                                  htmlInput: {
                                    maxLength: 1,
                                    inputMode: "numeric",
                                    pattern: "[0-9]*",
                                    "aria-label": `Verification digit ${
                                      index + 1
                                    }`,
                                  },
                                }}
                                sx={{
                                  minWidth: 0,

                                  "& .MuiOutlinedInput-root": {
                                    height: {
                                      xs: 54,
                                      sm: 60,
                                    },
                                    borderRadius: 3,
                                    bgcolor: colors.field,

                                    "& fieldset": {
                                      borderColor: errors.code
                                        ? colors.error
                                        : "transparent",
                                    },

                                    "&.Mui-focused fieldset": {
                                      borderColor:
                                        colors.primary,
                                      borderWidth: 2,
                                    },
                                  },

                                  "& input": {
                                    p: 0,
                                    textAlign: "center",
                                    fontSize: {
                                      xs: 21,
                                      sm: 24,
                                    },
                                    fontWeight: 700,
                                    color: colors.text,
                                  },
                                }}
                              />
                            )
                          )}
                        </Box>

                        {errors.code && (
                          <Typography
                            sx={{
                              mt: 1,
                              fontSize: 12,
                              color: colors.error,
                            }}
                          >
                            {errors.code.message}
                          </Typography>
                        )}
                      </Box>
                    );
                  }}
                />

                {/* Resend */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                    mt: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <MaterialIcon
                      name="schedule"
                      sx={{
                        fontSize: 16,
                        color: colors.primary,
                      }}
                    />

                    <Typography
                      sx={{
                        fontSize: 11,
                        color: colors.muted,
                      }}
                    >
                      Didn't receive the code?
                    </Typography>
                  </Box>

                  <Button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    sx={{
                      textTransform: "none",
                      color: colors.primary,
                      fontWeight: 700,
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    {isResending
                      ? "Sending..."
                      : "Resend Code"}
                  </Button>
                </Box>

                {resendMessage && (
                  <Typography
                    sx={{
                      mt: 1,
                      fontSize: 12,
                      color: colors.primary,
                    }}
                  >
                    {resendMessage}
                  </Typography>
                )}
              </Box>

              {/* New Password */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    mb: 1,
                  }}
                >
                  New Password
                </Typography>

                <TextField
                  fullWidth
                  type={
                    showPassword ? "text" : "password"
                  }
                  placeholder="Enter your new password"
                  autoComplete="new-password"
                  {...register("newPassword")}
                  error={!!errors.newPassword}
                  helperText={errors.newPassword?.message}
                  sx={fieldSx}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <MaterialIcon name="lock_reset" />
                        </InputAdornment>
                      ),

                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            type="button"
                            edge="end"
                            onClick={() =>
                              setShowPassword((prev) => !prev)
                            }
                            aria-label="Toggle password visibility"
                          >
                            <MaterialIcon
                              name={
                                showPassword
                                  ? "visibility_off"
                                  : "visibility"
                              }
                            />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                {/* Password Requirements */}
                <Box
                  sx={{
                    bgcolor: colors.field,
                    borderRadius: 3,
                    p: 2,
                    mt: 1.5,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: colors.muted,
                      mb: 1.5,
                      letterSpacing: 0.5,
                    }}
                  >
                    PASSWORD REQUIREMENTS
                  </Typography>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr 1fr",
                        sm: "1fr 1fr",
                      },
                      gap: 1.2,
                    }}
                  >
                    {passwordRules.map((rule) => {
                      const valid = rule.check(newPassword);

                      return (
                        <Box
                          key={rule.label}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.7,
                            minWidth: 0,
                          }}
                        >
                          <MaterialIcon
                            name={
                              valid
                                ? "check_circle"
                                : "radio_button_unchecked"
                            }
                            sx={{
                              fontSize: 17,
                              color: valid
                                ? colors.primary
                                : "#9ca7a5",
                            }}
                          />

                          <Typography
                            sx={{
                              fontSize: 11,
                              color: valid
                                ? colors.primary
                                : colors.muted,
                              fontWeight: valid ? 700 : 400,
                            }}
                          >
                            {rule.label}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Box>

              {/* Submit */}
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isSubmitting}
                startIcon={
                  isSubmitting ? (
                    <CircularProgress
                      size={18}
                      color="inherit"
                    />
                  ) : (
                    <MaterialIcon name="lock_reset" />
                  )
                }
                sx={{
                  height: 52,
                  borderRadius: 3,
                  bgcolor: colors.primary,
                  fontSize: 14,
                  fontWeight: 700,
                  textTransform: "none",
                  boxShadow:
                    "0 4px 14px rgba(0,92,85,0.2)",

                  "&:hover": {
                    bgcolor: colors.primaryLight,
                  },
                }}
              >
                {isSubmitting
                  ? "Resetting Password..."
                  : "Reset Password"}
              </Button>
            </Box>
          </Paper>
        )}

        {/* Back to Login */}
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mt: 3,
          }}
        >
          <Box
            component={Link}
            to="/login"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.8,
              color: colors.primary,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",

              "&:hover": {
                textDecoration: "underline",
              },
            }}
          >
            <MaterialIcon
              name="arrow_back"
              sx={{ fontSize: 18 }}
            />

            Back to Login
          </Box>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            mt: 3,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
            }}
          >
            <MaterialIcon
              name="security"
              sx={{
                fontSize: 17,
                color: colors.primary,
              }}
            />

            <Typography
              sx={{
                fontSize: 12,
                color: colors.muted,
              }}
            >
              Secure Password Recovery
            </Typography>
          </Box>

          <Typography
            sx={{
              fontSize: 11,
              color: colors.muted,
            }}
          >
            SmartDHP — Your Digital Healthcare Platform
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
