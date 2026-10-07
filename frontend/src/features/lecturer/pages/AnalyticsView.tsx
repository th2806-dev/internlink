import { LecturerAnalytics } from "../components/LecturerAnalytics";

interface AnalyticsViewProps {
  showToast?: (msg: string) => void;
}

export const AnalyticsView = ({ showToast: _showToast }: AnalyticsViewProps) => {
  return (
    <div className="animate-in fade-in duration-200">
      <LecturerAnalytics />
    </div>
  );
};
