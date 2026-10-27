
import React, { useState } from "react";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
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

import { loginSchema } from "../../validations/authSchemas";

const colors = {
  primary: "#005c55",
  primaryLight: "#0f766e",
  background: "#f9f9ff",
  surface: "#ffffff",
  field: "#f1f3ff",
  secondary: "#cee5df",
  text: "#041b3c",
  muted: "#3e4947",
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

export default function Login() {
  const [serverError, setServerError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm({
    resolver: yupResolver(loginSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data) => {
    setServerError(null);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/Account/Login`,
        data
      );

      console.log(response.data);

      setSuccess(true);
      navigate("/");
    } catch (err) {
      console.log(err.response);

      setServerError(
        err.response?.data?.message ||
          "Login failed. Please check your credentials."
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
                Login
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
              Secure Login
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
        {/* Welcome Section */}
        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            mb: 3,
          }}
        >
          {/* Centered Icon */}
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Box
              sx={{
                width: 76,
                height: 76,
                borderRadius: "50%",
                bgcolor: colors.secondary,
                display: "grid",
                placeItems: "center",
                position: "relative",
              }}
            >
              <Box
                sx={{
                  width: 55,
                  height: 55,
                  borderRadius: "50%",
                  bgcolor: "#fff",
                  color: colors.primary,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <MaterialIcon
                  name="health_and_safety"
                  sx={{ fontSize: 32 }}
                />
              </Box>

              <Box
                sx={{
                  position: "absolute",
                  bottom: -3,
                  right: -3,
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  bgcolor: colors.primary,
                  color: "#fff",
                  border: "2px solid #fff",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <MaterialIcon
                  name="verified"
                  sx={{ fontSize: 15 }}
                />
              </Box>
            </Box>
          </Box>

          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 28, sm: 34 },
              fontWeight: 800,
              mb: 1,
              color: colors.text,
            }}
          >
            Welcome Back
          </Typography>

          <Typography
            sx={{
              fontSize: 14,
              color: colors.muted,
              maxWidth: 350,
            }}
          >
            Sign in to continue your healthcare journey.
          </Typography>
        </Box>

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

        {/* Login Form */}
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
            sx={{
              width: "100%",
            }}
          >
            {/* Email Field */}
            <Box
              sx={{
                width: "100%",
                mb: 3,
              }}
            >
              {/* Email Label and Secure */}
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
                    color: colors.text,
                  }}
                >
                  Email Address
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 0.5,
                    ml: "auto",
                    flexShrink: 0,
                    color: colors.primary,
                  }}
                >
                  <MaterialIcon
                    name="lock"
                    sx={{
                      fontSize: 14,
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: colors.primary,
                    }}
                  >
                    Secure
                  </Typography>
                </Box>
              </Box>

              <TextField
                fullWidth
                type="email"
                size="small"
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

            {/* Password Field */}
            <Box
              sx={{
                width: "100%",
                mb: 3,
              }}
            >
              {/* Password Label and Forgot Password */}
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
                    color: colors.text,
                  }}
                >
                  Password
                </Typography>

                <Box
                  component={Link}
                  to="/sendcode"
                  sx={{
                    ml: "auto",
                    flexShrink: 0,
                    fontSize: 12,
                    color: colors.primary,
                    fontWeight: 700,
                    textDecoration: "none",
                    textAlign: "right",

                    "&:hover": {
                      color: colors.primaryLight,
                      textDecoration: "underline",
                    },
                  }}
                >
                  Forgot password?
                </Box>
              </Box>

              <TextField
                fullWidth
                size="small"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                {...register("password")}
                error={!!errors.password}
                helperText={errors.password?.message}
                sx={fieldSx}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <MaterialIcon name="key" />
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
                          aria-label={
                            showPassword
                              ? "Hide password"
                              : "Show password"
                          }
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
            </Box>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isSubmitting || success}
              startIcon={
                isSubmitting ? (
                  <CircularProgress
                    size={18}
                    color="inherit"
                  />
                ) : (
                  <MaterialIcon name="lock_open" />
                )
              }
              sx={{
                height: 52,
                borderRadius: 3,
                bgcolor: colors.primary,
                fontWeight: 700,
                fontSize: 14,
                textTransform: "none",
                boxShadow: "0 4px 14px rgba(0,92,85,0.2)",

                "&:hover": {
                  bgcolor: colors.primaryLight,
                },
              }}
            >
              {isSubmitting
                ? "Signing In..."
                : "Sign In to Portal"}
            </Button>
          </Box>
        </Paper>

        {/* Registration Links */}
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            boxSizing: "border-box",
            bgcolor: colors.surface,
            borderRadius: "18px",
            p: 2.5,
            mt: 3,
            boxShadow: "0 3px 14px rgba(4,27,60,0.05)",
          }}
        >
          {/* Patient Registration */}
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: 14,
                color: colors.muted,
              }}
            >
              New to SmartDHP?
            </Typography>

            <Box
              component={Link}
              to="/register"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                color: colors.primary,
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",

                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              Create Patient Account

              <MaterialIcon
                name="arrow_forward"
                sx={{ fontSize: 17 }}
              />
            </Box>
          </Box>

          <Divider
            sx={{
              my: 2,
              borderColor: "#e8edff",
            }}
          />

          {/* Doctor Registration */}
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 1,
              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: 13,
                color: colors.muted,
              }}
            >
              Are you a licensed clinician?
            </Typography>

            <Box
              component={Link}
              to="/docregister"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
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
                name="stethoscope"
                sx={{ fontSize: 17 }}
              />

              Join Doctor Network
            </Box>
          </Box>
        </Paper>

        {/* Centered Footer */}
        <Box
          sx={{
            width: "100%",
            mt: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: 1.2,
          }}
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
            }}
          >
            <MaterialIcon
              name="verified_user"
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
              Secure Healthcare Access
            </Typography>
          </Box>

          <Typography
            sx={{
              fontSize: 11,
              color: colors.muted,
              textAlign: "center",
            }}
          >
            SmartDHP — Your Digital Healthcare Platform
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
