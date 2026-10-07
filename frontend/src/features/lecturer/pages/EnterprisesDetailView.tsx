import { useSemester } from "../../../contexts/SemesterContext";
import { lecturerCompaniesService } from "../../../services/lecturerCompanies.service";
import { mapCompanyDetailDtoToEnterpriseDetail } from "../../../lib/portalMappers";
import { CompanyDetailView } from "../../../components/common/CompanyDetailView";

export const EnterprisesDetailView = () => {
  const { selectedSemesterId } = useSemester();

  const fetchDetail = (companyId: string, semesterId?: string) =>
    lecturerCompaniesService
      .getDetail(companyId, semesterId)
      .then((dto) => mapCompanyDetailDtoToEnterpriseDetail(dto));

  return (
    <div className="mx-auto max-w-[1300px] space-y-4 pb-12 font-sans">
      <CompanyDetailView
        fetchDetail={fetchDetail}
        backLabel="Quay lại danh sách"
        backPath="/lecturer/enterprises"
        semesterId={selectedSemesterId}
      />
    </div>
  );
};
