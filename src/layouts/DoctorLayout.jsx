import DashboardLayout from './DashboardLayout';
import { doctorNavigation } from '../config/navigation';

export default function DoctorLayout(props) {
  return <DashboardLayout {...props} role="Doctor" navigation={doctorNavigation} />;
}
