
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogContent,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  Controller,
  useForm,
} from "react-hook-form";

import { yupResolver } from "@hookform/resolvers/yup";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client.js";

import { docregisterSchema } from "../../validations/authSchemas";

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

const specializations = [
  "Cardiology",
  "General Medicine",
  "Pediatrics",
  "Neurology",
  "Dermatology",
  "Orthopedics",
  "Oncology",
  "Psychiatry",
];

function MaterialIcon({ name, sx = {} }) {
  return (
    <Box
      component="span"
      className="material-symbols-outlined"
      aria-hidden="true"
      sx={{
        fontSize: 22,
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Material Symbols Outlined",
        ...sx,
      }}
    >
      {name}
    </Box>
  );
}

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    minHeight: 49,
    borderRadius: "12px",
    bgcolor: colors.field,
    transition: "all 0.2s ease",

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

function FormField({ label, helper, error, children }) {
  return (
    <Box sx={{ minWidth: 0, width: "100%" }}>
      <Typography
        sx={{
          mb: 0.8,
          fontSize: 13,
          fontWeight: 600,
          color: colors.text,
        }}
      >
        {label}

        <Box
          component="span"
          sx={{ color: "#ba1a1a", ml: 0.5 }}
        >
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

function SectionHeader({ icon, title, badge }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      flexWrap="wrap"
      gap={1}
      sx={{ mb: 2.5 }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
      >
        <MaterialIcon
          name={icon}
          sx={{ color: colors.primary }}
        />

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

      {badge && (
        <Chip
          label={badge}
          size="small"
          sx={{
            bgcolor: colors.secondary,
            color: colors.primary,
            fontWeight: 700,
            fontSize: 11,
          }}
        />
      )}
    </Stack>
  );
}

export default function DoctorRegister() {
  const [serverError, setServerError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [openSuccess, setOpenSuccess] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const navigate = useNavigate();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(docregisterSchema),
    mode: "onBlur",
    defaultValues: {
      fullName: "",
      userName: "",
      email: "",
      password: "",
      confirmPassword: "",
      specialization: "",
      certificate: "",
      dateOfBirth: "",
      gender: "",
    },
  });

  async function handleRegisterDoctor(data) {
    setServerError(null);

    try {
      await api.post(
        "/Account/RegisterDoctor",
        data
      );

      setSuccess(true);
      setOpenSuccess(true);
    } catch {
      setServerError(
        "Registration failed. Please check your information and try again."
      );
    }
  }

  const password = watch("password") || "";
  const confirmPassword = watch("confirmPassword") || "";

  const selectedSpecialization =
    watch("specialization") || "";

  const passwordChecks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9\s]/.test(password),
  ];

  let strength = 0;
  for (const checkPassed of passwordChecks) {
    if (checkPassed) {
      strength++;
    }
  }

  let strengthLabel = "Strong";
  if (strength === 0) {
    strengthLabel = "Not entered";
  } else if (strength <= 2) {
    strengthLabel = "Weak";
  } else if (strength <= 4) {
    strengthLabel = "Moderate";
  }

  const passwordsMatch =
    password.length > 0 &&
    confirmPassword.length > 0 &&
    password === confirmPassword;

  function getFieldProps(name) {
    return {
      fullWidth: true,
      size: "small",
      variant: "outlined",
      sx: fieldSx,
      error: !!errors[name],
      ...register(name),
    };
  }

  function getIconAdornment(name) {
    return {
      startAdornment: (
        <InputAdornment position="start">
          <MaterialIcon name={name} />
        </InputAdornment>
      ),
    };
  }

  const sectionSx = {
    width: "100%",
    boxSizing: "border-box",
    minWidth: 0,
    p: { xs: 2.5, sm: 3 },
    borderRadius: "18px",
    bgcolor: colors.surface,
    boxShadow: "0 3px 14px rgba(4,27,60,0.05)",
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: colors.background,
        color: colors.text,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        pb: 5,
      }}
    >
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
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
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
              <MaterialIcon name="medical_services" />
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
                Doctor Registration
              </Typography>
            </Box>
          </Stack>

          <Chip
            icon={
              <MaterialIcon
                name="lock"
                sx={{ fontSize: 16 }}
              />
            }
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

      <Container maxWidth="sm" sx={{ mt: 4 }}>
        {/* Introduction */}
        <Stack
          alignItems="center"
          justifyContent="center"
          spacing={1.5}
          sx={{
            width: "100%",
            mb: 3,
            textAlign: "center",
          }}
        >
          <Chip
            icon={
              <MaterialIcon
                name="medical_services"
                sx={{ fontSize: 17 , textAlign:'center'}}
              />
            }
            label="PHYSICIAN REGISTRATION"
            sx={{
              bgcolor: colors.secondary,
              color: colors.primary,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          />

          {/* Centered Medical Icon */}
         
{/* Centered Medical Icon */}
<Box
  sx={{
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    my: 2,
  }}
>
  <Box
    sx={{
      width: 80,
      height: 80,
      borderRadius: "50%",
      bgcolor: colors.field,
      color: colors.primary,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      flexShrink: 0,
    }}
  >
    {/* Medical Bag */}
    <MaterialIcon
      name="medical_services"
      sx={{
        fontSize: 36,
        color: colors.primary,
      }}
    />

    {/* Shield */}
    <Box
      sx={{
        position: "absolute",
        bottom: -3,
        right: -3,
        width: 25,
        height: 25,
        bgcolor: colors.primary,
        borderRadius: "50%",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2px solid #fff",
      }}
    >
      <MaterialIcon
        name="shield"
        sx={{ fontSize: 15 }}
      />
    </Box>
  </Box>
</Box>

          <Typography
            component="h1"
            sx={{
              fontSize: { xs: 25, sm: 31 },
              fontWeight: 800,
              lineHeight: 1.3,
              textAlign: "center",
            }}
          >
            Join Our Medical Network
          </Typography>

          <Typography
            sx={{
              fontSize: 13,
              color: colors.muted,
             
              textAlign: "center",
            }}
          >
            Create your professional account and connect
            with patients through SmartDHP.
          </Typography>
        </Stack>

        {serverError && (
          <Alert
            severity="error"
            sx={{ mb: 2, borderRadius: 3 }}
          >
            {serverError}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit(handleRegisterDoctor)}
          noValidate
        >
          <Stack spacing={3}>
            {/* Account & Contact */}
            <Paper elevation={0} sx={sectionSx}>
              <SectionHeader
                icon="badge"
                title="Account & Contact"
                badge="Personal"
              />

              <Stack spacing={2.3}>
                <FormField
                  label="Full Name"
                  helper="Enter your name as shown on your professional documents"
                  error={errors.fullName}
                >
                  <TextField
                    {...getFieldProps("fullName")}
                    placeholder="Dr. Julian Marcus Vance"
                    slotProps={{
                      input: getIconAdornment("person"),
                    }}
                  />
                </FormField>

                <FormField
                  label="User Name"
                  error={errors.userName}
                >
                  <TextField
                    {...getFieldProps("userName")}
                    placeholder="dr_jvance"
                    slotProps={{
                      input: getIconAdornment("alternate_email"),
                    }}
                  />
                </FormField>

                <FormField
                  label="Email Address"
                  helper="Used for account-related communication"
                  error={errors.email}
                >
                  <TextField
                    {...getFieldProps("email")}
                    type="email"
                    placeholder="doctor@clinic.org"
                    slotProps={{
                      input: getIconAdornment("mail"),
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
                      {...getFieldProps("dateOfBirth")}
                      type="date"
                      slotProps={{
                        input: getIconAdornment("calendar_today"),
                      }}
                    />
                  </FormField>

                  <FormField
                    label="Gender"
                    error={errors.gender}
                  >
                    <Controller
                      name="gender"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          select
                          fullWidth
                          size="small"
                          error={!!errors.gender}
                          sx={fieldSx}
                          slotProps={{
                            input: getIconAdornment("wc"),
                          }}
                        >
                          <MenuItem value="Male">
                            Male
                          </MenuItem>

                          <MenuItem value="Female">
                            Female
                          </MenuItem>
                        </TextField>
                      )}
                    />
                  </FormField>
                </Box>
              </Stack>
            </Paper>

            {/* Security Access */}
            <Paper elevation={0} sx={sectionSx}>
              <SectionHeader
                icon="lock"
                title="Security Access"
                badge="Security"
              />

              <Stack spacing={2.3}>
                <FormField
                  label="Password"
                  error={errors.password}
                >
                  <TextField
                    {...getFieldProps("password")}
                    type={
                      showPassword ? "text" : "password"
                    }
                    placeholder="Minimum 8 characters"
                    slotProps={{
                      input: {
                        ...getIconAdornment("key"),

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
                </FormField>

                {/* Password Strength */}
                <Box
                  sx={{
                    bgcolor: colors.field,
                    borderRadius: 3,
                    p: 1.5,
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 1 }}
                  >
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: colors.muted,
                      }}
                    >
                      Password Strength
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: colors.primary,
                      }}
                    >
                      {strengthLabel}
                    </Typography>
                  </Stack>

                  <LinearProgress
                    variant="determinate"
                    value={strength * 20}
                    sx={{
                      height: 6,
                      borderRadius: 4,
                      bgcolor: colors.secondary,

                      "& .MuiLinearProgress-bar": {
                        bgcolor: colors.primary,
                        borderRadius: 4,
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
                    Use at least 8 characters, including
                    uppercase, lowercase, numbers and symbols.
                  </Typography>
                </Box>

                <FormField
                  label="Confirm Password"
                  error={errors.confirmPassword}
                >
                  <TextField
                    {...getFieldProps("confirmPassword")}
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Repeat your password"
                    slotProps={{
                      input: {
                        ...getIconAdornment("enhanced_encryption"),

                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              type="button"
                              edge="end"
                              onClick={() =>
                                setShowConfirmPassword(
                                  (prev) => !prev
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
                    alignItems="center"
                    spacing={0.7}
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
                        color: colors.primary,
                        fontWeight: 600,
                      }}
                    >
                      Passwords match
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </Paper>

            {/* Physician Credentials */}
            <Paper elevation={0} sx={sectionSx}>
              <SectionHeader
                icon="workspace_premium"
                title="Physician Credentials"
                badge="Professional"
              />

              <Stack spacing={2.5} sx={{ minWidth: 0 }}>
                <FormField
                  label="Medical Specialization"
                  error={errors.specialization}
                >
                  <Controller
                    name="specialization"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        select
                        fullWidth
                        size="small"
                        error={!!errors.specialization}
                        sx={fieldSx}
                        slotProps={{
                          input: getIconAdornment("cardiology"),
                        }}
                      >
                        {specializations.map((specialty) => (
                          <MenuItem
                            key={specialty}
                            value={specialty}
                          >
                            {specialty}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </FormField>

                {/* Synced Specialization Chips */}
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: 1,
                    width: "100%",
                    minWidth: 0,
                    boxSizing: "border-box",
                  }}
                >
                  {specializations.slice(0, 6).map(
                    (specialty) => {
                      const selected =
                        selectedSpecialization === specialty;

                      return (
                        <Chip
                          key={specialty}
                          label={specialty}
                          clickable
                          onClick={() =>
                            setValue(
                              "specialization",
                              specialty,
                              {
                                shouldValidate: true,
                                shouldDirty: true,
                                shouldTouch: true,
                              }
                            )
                          }
                          sx={{
                            maxWidth: "100%",
                            height: 34,
                            flexShrink: 0,
                            bgcolor: selected
                              ? colors.primary
                              : colors.field,
                            color: selected
                              ? "#fff"
                              : colors.muted,
                            fontWeight: selected ? 700 : 500,
                            fontSize: 12,
                            borderRadius: "20px",
                            transition: "all 0.2s ease",

                            "&:hover": {
                              bgcolor: selected
                                ? colors.primaryLight
                                : colors.secondary,
                            },
                          }}
                        />
                      );
                    }
                  )}
                </Box>

                {/* Medical Certificate - String */}
                <Box
                  sx={{
                    bgcolor: colors.field,
                    p: 2,
                    borderRadius: 3,
                    width: "100%",
                    minWidth: 0,
                    boxSizing: "border-box",
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{ mb: 2 }}
                  >
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        flexShrink: 0,
                        borderRadius: 3,
                        bgcolor: colors.secondary,
                        color: colors.primary,
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <MaterialIcon
                        name="description"
                        sx={{ fontSize: 24 }}
                      />
                    </Box>

                    <Box>
                      <Typography
                        sx={{
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        Medical Certificate
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: 11,
                          color: colors.muted,
                        }}
                      >
                        Enter your certificate or license reference
                      </Typography>
                    </Box>
                  </Stack>

                  <FormField
                    label="Certificate Reference"
                    error={errors.certificate}
                  >
                    <TextField
                      {...getFieldProps("certificate")}
                      placeholder="Enter certificate reference"
                      slotProps={{
                        input: getIconAdornment("workspace_premium"),
                      }}
                    />
                  </FormField>

                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="flex-start"
                    sx={{ mt: 2 }}
                  >
                    <MaterialIcon
                      name="info"
                      sx={{
                        fontSize: 18,
                        color: colors.primary,
                        flexShrink: 0,
                      }}
                    />

                    <Typography
                      sx={{
                        fontSize: 11,
                        color: colors.muted,
                        lineHeight: 1.6,
                      }}
                    >
                      Certificate details are collected as text.
                      Document uploads are not available yet.
                      Credential verification may be required
                      before practicing through the platform.
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Paper>

            {/* Submit */}
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
                  <MaterialIcon name="medical_services" />
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
                ? "Creating Account..."
                : "Create Doctor Account"}
            </Button>

            <Typography
              sx={{
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
          </Stack>
        </Box>

        {/* Centered Footer */}
       
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
    gap: 1.5,
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
      name="shield"
      sx={{
        fontSize: 20,
        color: colors.primary,
        flexShrink: 0,
      }}
    />

    <Typography
      sx={{
        fontSize: 12,
        color: colors.muted,
      }}
    >
      Professional Account Registration
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

      {/* Success Dialog */}
      <Dialog
        open={openSuccess}
        disableEscapeKeyDown
        onClose={() => {}}
        slotProps={{
          paper: {
            sx: {
              width: "100%",
              maxWidth: 420,
              borderRadius: "24px",
              p: { xs: 1, sm: 2 },
              textAlign: "center",
              boxShadow:
                "0 20px 60px rgba(0,0,0,0.15)",
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
              color: colors.primary,
              display: "grid",
              placeItems: "center",
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
            sx={{
              fontSize: 23,
              fontWeight: 800,
              color: colors.text,
              mb: 1.5,
            }}
          >
            Registration Successful!
          </Typography>

          <Typography
            sx={{
              fontSize: 14,
              color: colors.muted,
              lineHeight: 1.8,
              mb: 3,
            }}
          >
            Your doctor account has been created
            successfully. Please check your email
            for any required account activation steps.
          </Typography>

          <Box
            sx={{
              bgcolor: colors.field,
              borderRadius: 3,
              p: 2,
              mb: 3,
            }}
          >
            <MaterialIcon
              name="mark_email_read"
              sx={{
                fontSize: 30,
                color: colors.primary,
                mb: 1,
              }}
            />

            <Typography
              sx={{
                fontSize: 12,
                color: colors.muted,
              }}
            >
              Your professional credentials may require
              additional verification before your doctor
              account is approved.
            </Typography>
          </Box>

          <Button
            variant="contained"
            fullWidth
            onClick={() => navigate("/login")}
            sx={{
              bgcolor: colors.primary,
              borderRadius: 3,
              py: 1.5,
              textTransform: "none",
              fontWeight: 700,

              "&:hover": {
                bgcolor: colors.primaryLight,
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
