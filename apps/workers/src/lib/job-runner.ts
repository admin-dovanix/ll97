export type JobDefinition = {
  name: string;
  description: string;
  run: () => Promise<void>;
};

export async function runJob(job: JobDefinition) {
  console.log(`Starting ${job.name}: ${job.description}`);
  await job.run();
  console.log(`Finished ${job.name}`);
}
