import { useSemester } from "../../../contexts/SemesterContext";
import { useCallback } from "react";
import { adminCompaniesService, type AdminCompanyDetailDto } from "../../../services/adminCompanies.service";
import { CompanyDetailView } from "../../../components/common/CompanyDetailView";

export const CompaniesDetailView = () => {
  const { selectedSemesterId } = useSemester();

  const fetchDetail = useCallback(async (companyId: string) => {
    const payload: AdminCompanyDetailDto = await adminCompaniesService.getDetail(companyId);
    const internships = payload.internships.map((internship) => ({
      id: internship.id,
      studentId: internship.studentId,
      studentName: internship.studentName ?? "—",
      position: internship.position ?? "—",
      status: internship.status,
      startDate: internship.startDate,
      endDate: internship.endDate,
      submissionCount: internship.submissionCount,
    }));

    return {
      id: payload.company.id,
      name: payload.company.companyName,
      industry: payload.company.industry,
      contactPerson: payload.company.contactPerson,
      contactEmail: payload.company.contactEmail,
      contactPhone: payload.company.contactPhone,
      address: payload.company.address,
      studentCount: internships.length,
      totalSubmissions: internships.reduce((sum, item) => sum + item.submissionCount, 0),
      totalWeeklyReports: 0,
      pendingReviewsCount: 0,
      positions: payload.positions ?? [],
      internships,
    };
  }, []);

  return (
    <CompanyDetailView
      fetchDetail={fetchDetail}
      backLabel="Quay lại danh sách"
      backPath="/admin/companies"
      semesterId={selectedSemesterId}
      studentPath={() => "/admin/students"}
      isAdmin={true}
    />
  );
};

export { CompaniesDetailView as AdminCompaniesDetailView };
