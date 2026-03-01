import Image from 'next/image';
import { customers, jobs, staffMembers, visits } from '@/lib/mvp-data';
import { getPortalSession } from '@/lib/portal-auth';

export default function PortalJobsPage() {
  const session = getPortalSession();
  const customer = customers.find((entry) => entry.email === session?.email) ?? customers[0];
  const customerJobs = jobs.filter((job) => job.customerId === customer.id);

  return (
    <div className="card">
      <h3>Your Jobs</h3>
      {customerJobs.map((job) => {
        const jobVisits = visits.filter((visit) => visit.jobId === job.id);
        return (
          <article key={job.id} className="card">
            <h4>{job.title}</h4>
            <p>Service: {job.service}</p>
            <ul>
              {jobVisits.map((visit) => {
                const crew = staffMembers.find((member) => member.id === visit.assignedCrewIds[0]);
                return (
                  <li key={visit.id}>
                    {visit.title} — {new Date(visit.scheduledStart).toLocaleString()} (1-hr arrival window)
                    {crew ? (
                      <span>
                        {' '}| Crew: {crew.name}, {crew.phone} {crew.photoUrl ? <Image src={crew.photoUrl} alt={crew.name} width={32} height={32} /> : null}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </article>
        );
      })}
    </div>
  );
}
