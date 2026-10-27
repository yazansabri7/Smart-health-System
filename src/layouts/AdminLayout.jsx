import DashboardLayout from './DashboardLayout';
import { adminNavigation } from '../config/navigation';

export default function AdminLayout(props) {
  return <DashboardLayout {...props} role="Admin" navigation={adminNavigation} />;
}
