
import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  MenuItem,
  TextField,
  Typography,
  Stack,
  Paper,
  InputAdornment,
  IconButton,
  LinearProgress,
  Chip,
  CircularProgress,
} from "@mui/material";


import {
  Dialog,
  DialogContent,
  Fade,
} from "@mui/material";

import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { registerSchema } from "../../validations/authSchemas";
import { yupResolver } from "@hookform/resolvers/yup";
import axios from "axios";

// Google Material Symbols - no @mui/icons-material imports
const MaterialIcon = ({ name, sx = {} }) => (
  <Box
    component="span"
    className="material-symbols-outlined"
    aria-hidden="true"
    sx={{
      fontSize: 21,
      lineHeight: 1,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      ...sx,
    }}
  >
    {name}
  </Box>
);

const colors = {
  primary: "#005c55",
  primaryLight: "#0f766e",
  background: "#f9f9ff",
  field: "#f1f3ff",
  surface: "#ffffff",
  text: "#041b3c",
  muted: "#3e4947",
  secondary: "#cee5df",
};

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    minHeight: 48,
    borderRadius: "12px",
    backgroundColor: colors.field,
    transition: "all .2s ease",
    "& fieldset": { borderColor: "transparent" },
    "&:hover fieldset": { borderColor: "#bdc9c6" },
    "&.Mui-focused": {
      backgroundColor: "#fff",
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

const sectionSx = {
  p: { xs: 2, sm: 3 },
  borderRadius: "16px",
  backgroundColor: colors.surface,
  boxShadow: "0 3px 14px rgba(4,27,60,.045)",
};

function SectionHeader({ number, title, tag }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={1}
      sx={{ mb: 2.5 }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            bgcolor: colors.primary,
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {number}
        </Box>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: { xs: 16, sm: 18 },
            color: colors.text,
          }}
        >
          {title}
        </Typography>
      </Stack>

      <Chip
        label={tag}
        size="small"
        sx={{
          bgcolor: colors.secondary,
          color: colors.primary,
          fontWeight: 700,
          fontSize: 11,
        }}
      />
    </Stack>
  );
}

function FormField({ label, helper, error, children }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        sx={{
          mb: 0.8,
          fontSize: 13,
          fontWeight: 600,
          color: colors.text,
        }}
      >
        {label}
        <Box component="span" sx={{ color: "#ba1a1a", ml: 0.5 }}>
          *
        </Box>
      </Typography>

      {children}

      {(error?.message || helper) && (
        <Typography
          sx={{
            mt: 0.7,
            fontSize: 11.5,
            color: error ? "#ba1a1a" : colors.muted,
          }}
        >
          {error?.message || helper}
        </Typography>
      )}
    </Box>
  );
}

export default function Register() {
  const [openSuccess, setOpenSuccess] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(registerSchema),
    mode: "onBlur",
  });

  // Original registration logic - unchanged
  const onSubmit = async (data) => {
    console.log(data);
    try {
      const respone = await axios.post(
        "https://chatsystem.runasp.net/api/Account/RegisterPatient",
        data
      );
      console.log(respone);
      setSuccess(true);
      setOpenSuccess(true);

      setTimeout(() => {
        navigate("/login");
      }, 10000);

    } catch (err) {
      console.log(err.response);
      setServerError("Registeration Failed ");
    }
  };

  // Visual indicators only
  const password = watch("password") || "";
  const confirmPassword = watch("confirmPassword") || "";

  const passwordChecks = [
    password.length >= 6,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];

  const strength = passwordChecks.filter(Boolean).length;

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  const iconAdornment = (name) => ({
    startAdornment: (
      <InputAdornment position="start">
        <MaterialIcon name={name} />
      </InputAdornment>
    ),
  });

  const fieldProps = (name) => ({
    fullWidth: true,
    size: "small",
    variant: "outlined",
    sx: fieldSx,
    error: !!errors[name],
    ...register(name),
  });

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: colors.background,
        color: colors.text,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        pb: 4,
      }}
    >
      {/* Load Google Fonts */}
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
          bgcolor: "rgba(249,249,255,.92)",
          backdropFilter: "blur(16px)",
          boxShadow: "0 1px 8px rgba(0,0,0,.04)",
          py: 1.5,
          px: { xs: 2, md: 5 },
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <IconButton
              onClick={() => navigate(-1)}
              sx={{ color: colors.muted }}
              aria-label="Go back"
            >
              <MaterialIcon name="arrow_back" />
            </IconButton>

            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: "12px",
                bgcolor: colors.secondary,
                color: colors.primary,
                display: "grid",
                placeItems: "center",
              }}
            >
              <MaterialIcon name="verified_user" />
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: colors.primary,
                  lineHeight: 1.2,
                }}
              >
                SmartDHP
              </Typography>
              <Typography sx={{ fontSize: 11, color: colors.muted }}>
                Patient Registration
              </Typography>
            </Box>
          </Stack>

          <Chip
            icon={<MaterialIcon name="lock" sx={{ fontSize: 15 }} />}
            label="Secure Registration"
            size="small"
            sx={{
              display: { xs: "none", sm: "flex" },
              bgcolor: colors.secondary,
              color: colors.primary,
              fontWeight: 600,
            }}
          />
        </Stack>
      </Box>

      <Container maxWidth="md" sx={{ mt: 3 }}>
        {/* Server Error */}
        {serverError && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
            {serverError}
          </Alert>
        )}

        {/* Introduction */}
        <Paper elevation={0} sx={{ ...sectionSx, mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                width: 50,
                height: 50,
                flexShrink: 0,
                borderRadius: 3,
                bgcolor: colors.secondary,
                color: colors.primary,
                display: "grid",
                placeItems: "center",
              }}
            >
              <MaterialIcon name="how_to_reg" sx={{ fontSize: 28 }} />
            </Box>

            <Box>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 1,
                  color: colors.primary,
                  textTransform: "uppercase",
                }}
              >
                ● New Patient Pathway
              </Typography>

              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: 24, sm: 32 },
                  fontWeight: 800,
                  lineHeight: 1.3,
                  my: 0.5,
                }}
              >
                Create Your Patient Account
              </Typography>

              <Typography sx={{ fontSize: 13, color: colors.muted }}>
                Join us to manage your health journey with confidence.
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={3}>
            {/* Section 1: Personal Information */}
            <Paper elevation={0} sx={sectionSx}>
              <SectionHeader
                number="1"
                title="Personal Information"
                tag="Identity"
              />

              <Stack spacing={2.3}>
                <FormField
                  label="Full Name"
                  helper="As it appears on your legal identification or insurance card"
                  error={errors.fullName}
                >
                  <TextField
                    {...fieldProps("fullName")}
                    placeholder="Eleanor Vance"
                    slotProps={{
                      input: iconAdornment("person"),
                    }}
                  />
                </FormField>

                <FormField
                  label="User Name"
                  helper="Unique identifier for portal access and secure telehealth"
                  error={errors.userName}
                >
                  <TextField
                    {...fieldProps("userName")}
                    placeholder="eleanor.vance"
                    slotProps={{
                      input: iconAdornment("alternate_email"),
                    }}
                  />
                </FormField>

                <FormField
                  label="Email Address"
                  error={errors.email}
                >
                  <TextField
                    {...fieldProps("email")}
                    type="email"
                    placeholder="you@example.com"
                    slotProps={{
                      input: iconAdornment("mail"),
                    }}
                  />
                </FormField>

                <FormField
                  label="Phone Number"
                  helper="Used for prescription alerts and appointment verifications"
                  error={errors.phoneNumber}
                >
                  <TextField
                    {...fieldProps("phoneNumber")}
                    type="tel"
                    placeholder="Phone number"
                    slotProps={{
                      input: iconAdornment("call"),
                    }}
                  />
                </FormField>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "1fr 1fr",
                    },
                    gap: 2,
                  }}
                >
                  <FormField
                    label="Date of Birth"
                    error={errors.dateOfBirth}
                  >
                    <TextField
                      {...fieldProps("dateOfBirth")}
                      type="date"
                      slotProps={{
                        input: iconAdornment("calendar_today"),
                      }}
                    />
                  </FormField>

                  <FormField
                    label="Gender"
                    helper="For clinical baseline accuracy"
                    error={errors.gender}
                  >
                    <TextField
                      {...fieldProps("gender")}
                      select
                      defaultValue=""
                      slotProps={{
                        input: iconAdornment("wc"),
                      }}
                    >
                      <MenuItem value="Male">Male</MenuItem>
                      <MenuItem value="Female">Female</MenuItem>
                    </TextField>
                  </FormField>
                </Box>

                <FormField
                  label="City"
                  helper="Matches local regional network providers"
                  error={errors.city}
                >
                  <TextField
                    {...fieldProps("city")}
                    placeholder="Your city"
                    slotProps={{
                      input: iconAdornment("location_city"),
                    }}
                  />
                </FormField>
              </Stack>
            </Paper>

            {/* Section 2: Health Information */}
            <Paper elevation={0} sx={sectionSx}>
              <SectionHeader
                number="2"
                title="Health Information"
                tag="Vitals"
              />

              <Typography
                sx={{
                  fontSize: 12,
                  color: colors.muted,
                  mb: 2.5,
                }}
              >
                These basic vitals assist in calculating clinical metrics
                and safe medication dosing.
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(3, minmax(0, 1fr))",
                  },
                  gap: 2,
                }}
              >
                <FormField
                  label="Age"
                  helper="Years"
                  error={errors.age}
                >
                  <TextField
                    {...fieldProps("age")}
                    placeholder="32"
                    slotProps={{
                      input: iconAdornment("cake"),
                    }}
                  />
                </FormField>

                <FormField
                  label="Height"
                  helper="e.g. 178 cm"
                  error={errors.height}
                >
                  <TextField
                    {...fieldProps("height")}
                    placeholder="178"
                    slotProps={{
                      input: iconAdornment("height"),
                    }}
                  />
                </FormField>

                <FormField
                  label="Weight"
                  helper="e.g. 70 kg"
                  error={errors.weight}
                >
                  <TextField
                    {...fieldProps("weight")}
                    placeholder="70"
                    slotProps={{
                      input: iconAdornment("monitor_weight"),
                    }}
                  />
                </FormField>
              </Box>
            </Paper>

            {/* Section 3: Account Security */}
            <Paper elevation={0} sx={sectionSx}>
              <SectionHeader
                number="3"
                title="Account Security"
                tag="Security"
              />

              <Stack spacing={2.5}>
                <FormField
                  label="Password"
                  error={errors.password}
                >
                  <TextField
                    {...fieldProps("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a secure password"
                    slotProps={{
                      input: {
                        ...iconAdornment("lock"),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              type="button"
                              edge="end"
                              onClick={() =>
                                setShowPassword(!showPassword)
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
                </FormField>

                {/* Visual Password Strength */}
                <Box
                  sx={{
                    bgcolor: colors.field,
                    p: 1.5,
                    borderRadius: 3,
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1 }}
                  >
                    <Stack
                      direction="row"
                      spacing={0.7}
                      alignItems="center"
                    >
                      <MaterialIcon
                        name="shield_with_heart"
                        sx={{
                          fontSize: 17,
                          color: colors.primary,
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: 11,
                          color: colors.muted,
                        }}
                      >
                        Security Strength
                      </Typography>
                    </Stack>

                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: colors.primary,
                      }}
                    >
                      {strength === 0
                        ? "Not entered"
                        : strength <= 2
                          ? "Weak"
                          : strength <= 4
                            ? "Moderate"
                            : "Strong"}
                    </Typography>
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={strength * 20}
                    sx={{
                      height: 6,
                      borderRadius: 5,
                      bgcolor: colors.secondary,
                      "& .MuiLinearProgress-bar": {
                        bgcolor: colors.primary,
                        borderRadius: 5,
                      },
                    }}
                  />

                  <Typography
                    sx={{
                      fontSize: 11,
                      color: colors.muted,
                      mt: 1,
                    }}
                  >
                    Use uppercase, lowercase, numbers and special characters.
                  </Typography>
                </Box>

                <FormField
                  label="Confirm Password"
                  error={errors.confirmPassword}
                >
                  <TextField
                    {...fieldProps("confirmPassword")}
                    type={
                      showConfirmPassword ? "text" : "password"
                    }
                    placeholder="Confirm your password"
                    slotProps={{
                      input: {
                        ...iconAdornment("lock_reset"),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              type="button"
                              edge="end"
                              onClick={() =>
                                setShowConfirmPassword(
                                  !showConfirmPassword
                                )
                              }
                              aria-label="Toggle confirm password visibility"
                            >
                              <MaterialIcon
                                name={
                                  showConfirmPassword
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
                </FormField>

                {passwordsMatch && (
                  <Stack
                    direction="row"
                    spacing={0.7}
                    alignItems="center"
                  >
                    <MaterialIcon
                      name="check_circle"
                      sx={{
                        fontSize: 17,
                        color: colors.primary,
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: colors.primary,
                      }}
                    >
                      Passwords match perfectly
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </Paper>

            {/* Submit Button */}
            <Box>
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
                    <MaterialIcon name="verified_user" />
                  )
                }
                sx={{
                  height: 50,
                  bgcolor: colors.primary,
                  borderRadius: 3,
                  fontWeight: 700,
                  fontSize: 14,
                  textTransform: "none",
                  boxShadow:
                    "0 4px 12px rgba(0,92,85,.18)",
                  "&:hover": {
                    bgcolor: colors.primaryLight,
                  },
                }}
              >
                {isSubmitting
                  ? "Loading...."
                  : "Complete Registration"}
              </Button>

              <Typography
                sx={{
                  mt: 2,
                  textAlign: "center",
                  fontSize: 13,
                  color: colors.muted,
                }}
              >
                Already have a SmartDHP account?{" "}
                <Box
                  component={Link}
                  to="/login"
                  sx={{
                    color: colors.primary,
                    fontWeight: 700,
                    textDecoration: "underline",
                    textUnderlineOffset: 4,
                  }}
                >
                  Sign In
                </Box>
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Footer */}
        <Stack
          alignItems="center"
          spacing={1}
          sx={{
            mt: 4,
            pb: 2,
            textAlign: "center",
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
          >
            <MaterialIcon
              name="shield"
              sx={{
                color: colors.primary,
                fontSize: 18,
              }}
            />
            <Typography
              sx={{
                fontSize: 12,
                color: colors.muted,
              }}
            >
              Secure Patient Registration
            </Typography>
          </Stack>

          <Typography
            sx={{
              fontSize: 11,
              color: colors.muted,
            }}
          >
            SmartDHP — Your digital healthcare platform
          </Typography>
        </Stack>
      </Container>
      <Dialog
        open={openSuccess}
        slots={{ transition: Fade }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "24px",
              p: { xs: 1, sm: 2 },
              width: "100%",
              maxWidth: "420px",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            },
          },
        }}
      >
        <DialogContent>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              bgcolor: "#e0f2ef",
              color: "#005c55",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 3,
            }}
          >
            <MaterialIcon
              name="check_circle"
              sx={{ fontSize: 48 }}
            />
          </Box>

          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: "#041b3c",
              mb: 1.5,
            }}
          >
            Registration Successful!
          </Typography>

          <Typography
            sx={{
              fontSize: 14,
              color: "#3e4947",
              lineHeight: 1.8,
              mb: 3,
            }}
          >
            Your account has been created successfully.
            Please check your email to verify and activate
            your account.
          </Typography>

          <Box
            sx={{
              bgcolor: "#f1f3ff",
              borderRadius: 3,
              p: 2,
              mb: 3,
            }}
          >
            <MaterialIcon
              name="mark_email_read"
              sx={{
                fontSize: 30,
                color: "#005c55",
                mb: 1,
              }}
            />

            <Typography
              sx={{
                fontSize: 12,
                color: "#3e4947",
              }}
            >
              Check your inbox for the activation email.
            </Typography>
          </Box>

          <Typography
            sx={{
              fontSize: 12,
              color: "#6e7977",
              mb: 2,
            }}
          >
            Redirecting to Login in 10 seconds...
          </Typography>

          <Button
            variant="contained"
            fullWidth
            onClick={() => navigate("/login")}
            sx={{
              bgcolor: "#005c55",
              borderRadius: 3,
              py: 1.5,
              textTransform: "none",
              fontWeight: 700,
              "&:hover": {
                bgcolor: "#0f766e",
              },
            }}
          >
            Continue to Login
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
