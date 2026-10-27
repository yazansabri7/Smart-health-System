
import React, { useState } from "react";

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

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import { sendSchema } from "../../validations/authSchemas";

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

export default function SendCode() {
  const [serverError, setServerError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(sendSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data) => {
    setServerError(null);

    try {
      const response = await axios.post(
        "https://chatsystem.runasp.net/api/Account/SendCode",
        data
      );

      console.log(response.data);

      setSentEmail(data.email);
      setSuccess(true);
    } catch (err) {
      console.log(err.response);

      setServerError(
        err.response?.data?.message ||
          "Unable to send the reset code. Please check your email and try again."
      );
    }
  };

  const handleResend = async () => {
    if (!sentEmail || isSubmitting) return;

    setServerError(null);

    try {
      await axios.post(
        "https://chatsystem.runasp.net/api/Account/SendCode",
        { email: sentEmail }
      );
    } catch (err) {
      console.log(err.response);

      setServerError(
        "Unable to resend the code. Please try again."
      );
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
                Forgot Password
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

      <Container
        maxWidth="sm"
        sx={{
          mt: 5,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            boxSizing: "border-box",
            bgcolor: colors.surface,
            borderRadius: "24px",
            p: { xs: 2.5, sm: 4 },
            boxShadow: "0 4px 18px rgba(4,27,60,0.06)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Decorative Background */}
          <Box
            sx={{
              position: "absolute",
              top: -70,
              right: -70,
              width: 180,
              height: 180,
              borderRadius: "50%",
              bgcolor: "rgba(206,229,223,0.4)",
              filter: "blur(25px)",
              pointerEvents: "none",
            }}
          />

          <Box
            sx={{
              position: "absolute",
              bottom: -70,
              left: -70,
              width: 180,
              height: 180,
              borderRadius: "50%",
              bgcolor: "rgba(156,242,232,0.2)",
              filter: "blur(25px)",
              pointerEvents: "none",
            }}
          />

          <Box sx={{ position: "relative", zIndex: 1 }}>
            {/* Centered Recovery Icon */}
            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Box
                sx={{
                  width: 96,
                  height: 96,
                  borderRadius: "50%",
                  bgcolor: "rgba(206,229,223,0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "18px",
                    bgcolor: colors.secondary,
                    display: "grid",
                    placeItems: "center",
                    color: colors.primary,
                  }}
                >
                  <MaterialIcon
                    name="mark_email_unread"
                    sx={{ fontSize: 48 }}
                  />
                </Box>

                <Box
                  sx={{
                    position: "absolute",
                    bottom: -3,
                    right: -3,
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    bgcolor: colors.primaryLight,
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    border: "2px solid #fff",
                  }}
                >
                  <MaterialIcon
                    name="lock_reset"
                    sx={{ fontSize: 19 }}
                  />
                </Box>
              </Box>
            </Box>

            {/* Heading */}
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: 25, sm: 30 },
                fontWeight: 800,
                textAlign: "center",
                mb: 1,
                color: colors.text,
              }}
            >
              Forgot Your Password?
            </Typography>

            <Typography
              sx={{
                fontSize: 14,
                lineHeight: 1.7,
                color: colors.muted,
                textAlign: "center",
                maxWidth: 340,
                mx: "auto",
                mb: 3,
              }}
            >
              Enter your email address and we'll help you
              reset your password.
            </Typography>

            {/* Server Error */}
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
              <Box
                sx={{
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <Box
                  sx={{
                    bgcolor: "rgba(206,229,223,0.55)",
                    borderRadius: 3,
                    p: 2.5,
                    mb: 3,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        bgcolor: colors.primary,
                        color: "#fff",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <MaterialIcon
                        name="check"
                        sx={{ fontSize: 20 }}
                      />
                    </Box>

                    <Typography
                      sx={{
                        fontSize: 17,
                        fontWeight: 700,
                        color: colors.primary,
                      }}
                    >
                      Reset Code Sent!
                    </Typography>
                  </Box>

                  <Typography
                    sx={{
                      fontSize: 13,
                      lineHeight: 1.8,
                      color: colors.muted,
                    }}
                  >
                    If the email is registered, a password
                    reset code has been sent to:
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: colors.primary,
                      mt: 1,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {sentEmail}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: 1,
                      mt: 2,
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
                        Check your inbox and spam folder
                      </Typography>
                    </Box>

                    <Button
                      type="button"
                      onClick={handleResend}
                      sx={{
                        color: colors.primary,
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      Resend Email
                    </Button>
                  </Box>
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={() =>
                    navigate("/resetpassword", {
                      state: { email: sentEmail },
                    })
                  }
                  endIcon={
                    <MaterialIcon name="arrow_forward" />
                  }
                  sx={{
                    height: 52,
                    borderRadius: 3,
                    bgcolor: colors.primary,
                    fontWeight: 700,
                    textTransform: "none",

                    "&:hover": {
                      bgcolor: colors.primaryLight,
                    },
                  }}
                >
                  Continue to Reset Password
                </Button>
              </Box>
            ) : (
              /* Recovery Form */
              <Box
                component="form"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                sx={{
                  width: "100%",
                }}
              >
                {/* Email Label */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    width: "100%",
                    mb: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.text,
                    }}
                  >
                    Email Address
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 11,
                      color: colors.muted,
                      textAlign: "right",
                      ml: "auto",
                    }}
                  >
                    Patient or Clinician
                  </Typography>
                </Box>

                {/* Email Input */}
                <TextField
                  fullWidth
                  type="email"
                  size="small"
                  placeholder="name@example.com"
                  autoComplete="email"
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

                {/* Helper Text */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 0.7,
                    mt: 1,
                    mb: 3,
                  }}
                >
                  <MaterialIcon
                    name="info"
                    sx={{
                      fontSize: 15,
                      color: colors.primary,
                      mt: 0.2,
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 11,
                      lineHeight: 1.6,
                      color: colors.muted,
                    }}
                  >
                    Enter the email associated with your
                    patient or doctor profile.
                  </Typography>
                </Box>

                {/* Submit */}
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={isSubmitting}
                  endIcon={
                    isSubmitting ? (
                      <CircularProgress
                        size={18}
                        color="inherit"
                      />
                    ) : (
                      <MaterialIcon name="arrow_forward" />
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
                    ? "Sending Secure Code..."
                    : "Send Reset Code"}
                </Button>
              </Box>
            )}

            {/* Security Information */}
            <Box
              sx={{
                mt: 3,
                p: 2,
                bgcolor: colors.field,
                borderRadius: 3,
                display: "flex",
                alignItems: "flex-start",
                gap: 1.2,
              }}
            >
              <MaterialIcon
                name="verified_user"
                sx={{
                  fontSize: 21,
                  color: colors.primary,
                }}
              />

              <Typography
                sx={{
                  fontSize: 12,
                  lineHeight: 1.8,
                  color: colors.muted,
                }}
              >
                For your security, use only the verification
                code sent through the official SmartDHP
                password recovery process. Never share your
                reset code or password with anyone.
              </Typography>
            </Box>
          </Box>
        </Paper>

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
              justifyContent: "center",
              gap: 1,
              color: colors.primary,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: "none",
              py: 1,

              "&:hover": {
                color: colors.primaryLight,
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
            width: "100%",
            mt: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.2,
            textAlign: "center",
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
              name="shield"
              sx={{
                fontSize: 18,
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
