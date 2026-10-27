import DashboardLayout from './DashboardLayout';
import { patientNavigation } from '../config/navigation';

export default function PatientLayout(props) {
  return <DashboardLayout {...props} role="Patient" navigation={patientNavigation} />;
}
