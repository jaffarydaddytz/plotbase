import { Link } from "react-router-dom";
import {
  HiOutlineClipboardList,
  HiOutlinePlus,
} from "react-icons/hi";

const CompanyProjects = () => {
  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Company Projects
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage your company's real estate projects,
            drafts, and land inventory.
          </p>
        </div>

        <Link
          to="/company/projects/create"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-medium text-white transition hover:bg-emerald-700"
        >
          <HiOutlinePlus size={20} />
          Create Project
        </Link>

      </div>

      {/* Projects Content */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">

        <h2 className="text-lg font-semibold text-gray-800">
          My Projects
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Your company's projects will appear here.
        </p>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-16 text-center">

          <div className="mb-4 rounded-full bg-emerald-50 p-5">
            <HiOutlineClipboardList
              size={40}
              className="text-emerald-600"
            />
          </div>

          <h3 className="text-lg font-semibold text-gray-800">
            Project inventory not loaded
          </h3>

          <p className="mt-2 max-w-md text-sm text-gray-500">
            Once the company project API is integrated,
            you will be able to view and manage your
            projects from this dashboard.
          </p>

        </div>

      </div>

    </div>
  );
};

export default CompanyProjects;