from django.core.management.base import BaseCommand

from jobs.models import Job

SEED_JOBS = [
    {
        "title": "AI Product Operator",
        "team": "AI/Product",
        "location": "Remote",
        "is_remote": True,
        "experience_level": Job.ExperienceLevel.SENIOR,
        "status": Job.Status.OPEN,
        "responsibilities": (
            "- Own the end-to-end lifecycle of AI-powered product features from ideation through launch and iteration\n"
            "- Define and track success metrics for AI capabilities including accuracy, latency, and user satisfaction\n"
            "- Collaborate with machine learning engineers to translate business requirements into model specifications\n"
            "- Design and execute A/B experiments to validate AI feature hypotheses and measure impact\n"
            "- Build and maintain evaluation frameworks for LLM-based features, including prompt management and regression testing\n"
            "- Triage and prioritize model quality issues reported by users and internal stakeholders\n"
            "- Create and curate golden datasets for model evaluation and fine-tuning\n"
            "- Partner with design and engineering to craft intuitive user experiences around AI capabilities\n"
            "- Communicate product strategy, roadmap updates, and performance insights to leadership"
        ),
        "requirements": (
            "- 5+ years of experience in product management, product operations, or a related technical role\n"
            "- 2+ years of hands-on experience working with AI/ML products or LLM-based applications\n"
            "- Strong understanding of machine learning concepts, prompt engineering, and evaluation methodologies\n"
            "- Proficiency with data analysis tools (SQL, Python, or similar) to derive actionable insights\n"
            "- Demonstrated ability to work cross-functionally with engineering, design, and data science teams\n"
            "- Excellent written and verbal communication skills with the ability to explain technical concepts to non-technical audiences\n"
            "- Experience with experimentation frameworks and statistical analysis\n"
            "- Familiarity with the modern AI tooling ecosystem (vector databases, orchestration frameworks, evaluation tools)\n"
            "- Bonus: experience with HR-tech, recruiting platforms, or workforce management products"
        ),
        "description": (
            "We are looking for a Senior AI Product Operator to drive the development and continuous improvement "
            "of our AI-powered candidate onboarding platform. In this role you will sit at the intersection of product, "
            "engineering, and data science, ensuring that our AI features deliver real value to hiring teams and candidates alike.\n\n"
            "You will own the operational backbone of our AI capabilities: defining evaluation criteria, managing prompt "
            "libraries, monitoring model performance in production, and coordinating rapid iteration cycles. The ideal "
            "candidate combines deep product intuition with technical fluency in modern AI systems and thrives in a "
            "fast-paced, ambiguity-rich environment.\n\n"
            "This is a fully remote position open to candidates based anywhere in the United States."
        ),
    },
    {
        "title": "Full Stack Engineer",
        "team": "Engineering",
        "location": "Hybrid - New York, NY",
        "is_remote": False,
        "experience_level": Job.ExperienceLevel.MID,
        "status": Job.Status.OPEN,
        "responsibilities": (
            "- Design, build, and maintain features across our React/TypeScript frontend and Django/Python backend\n"
            "- Develop RESTful APIs and GraphQL endpoints that power candidate and recruiter workflows\n"
            "- Implement responsive, accessible UI components following our design system\n"
            "- Write comprehensive unit, integration, and end-to-end tests to ensure reliability\n"
            "- Participate in architecture discussions and technical design reviews\n"
            "- Optimize application performance including database queries, API response times, and frontend bundle size\n"
            "- Collaborate with product and design to scope, estimate, and deliver features iteratively\n"
            "- Contribute to CI/CD pipeline improvements and infrastructure-as-code practices\n"
            "- Mentor junior engineers through code reviews and pair programming sessions"
        ),
        "requirements": (
            "- 3-6 years of professional software engineering experience in full stack web development\n"
            "- Strong proficiency in Python and Django (or a comparable server-side framework)\n"
            "- Strong proficiency in TypeScript and React (Next.js experience is a plus)\n"
            "- Solid understanding of relational databases (PostgreSQL preferred) and ORM patterns\n"
            "- Experience with RESTful API design and at least basic familiarity with GraphQL\n"
            "- Comfort with cloud platforms (AWS or GCP) and containerized deployments (Docker, Kubernetes)\n"
            "- Familiarity with automated testing strategies and CI/CD tooling (GitHub Actions, CircleCI, or similar)\n"
            "- Strong collaborative mindset and clear communication skills in a team environment\n"
            "- Bonus: experience integrating third-party AI/ML APIs or building LLM-powered features"
        ),
        "description": (
            "We are hiring a Full Stack Engineer to help build the next generation of our AI-powered onboarding platform. "
            "You will work across the entire stack, shipping features that directly impact how companies hire and onboard "
            "talent at scale.\n\n"
            "Our tech stack centers on Django and PostgreSQL on the backend with a React and TypeScript frontend. "
            "You will build everything from candidate-facing application flows to internal recruiter dashboards, "
            "integrating AI capabilities that streamline screening, scheduling, and decision-making.\n\n"
            "This is a hybrid role based in our New York City office, with in-office expectations of three days per week. "
            "We value engineers who are curious, ship iteratively, and care deeply about the end-user experience."
        ),
    },
    {
        "title": "Data Scientist",
        "team": "Data",
        "location": "Remote",
        "is_remote": True,
        "experience_level": Job.ExperienceLevel.MID,
        "status": Job.Status.OPEN,
        "responsibilities": (
            "- Develop and validate predictive models for candidate-job matching, time-to-hire forecasting, and attrition risk\n"
            "- Analyze large-scale recruiting and onboarding datasets to uncover actionable patterns and insights\n"
            "- Design and run experiments to measure the effectiveness of AI-driven product features\n"
            "- Build and maintain data pipelines for feature engineering and model training workflows\n"
            "- Create dashboards and reports that communicate key metrics to product and business stakeholders\n"
            "- Collaborate with ML engineers to productionize models and monitor their performance over time\n"
            "- Conduct exploratory data analysis to identify new opportunities for automation and optimization\n"
            "- Contribute to the development of fair and unbiased hiring algorithms through rigorous auditing practices"
        ),
        "requirements": (
            "- 3-5 years of professional experience in data science, applied machine learning, or a quantitative research role\n"
            "- Strong proficiency in Python and core data science libraries (pandas, scikit-learn, NumPy, matplotlib)\n"
            "- Experience building and evaluating classification, regression, and ranking models\n"
            "- Solid understanding of statistical methods, hypothesis testing, and experimental design\n"
            "- Proficiency in SQL and experience working with large-scale data warehouses (BigQuery, Snowflake, or Redshift)\n"
            "- Familiarity with NLP techniques and text-based feature extraction for unstructured data\n"
            "- Experience with data visualization tools (Looker, Tableau, or similar)\n"
            "- Strong communication skills with the ability to present technical findings to non-technical audiences\n"
            "- Bonus: experience with fairness-aware ML, HR analytics, or people-data platforms"
        ),
        "description": (
            "We are looking for a Data Scientist to join our Data team and help shape the intelligence layer of our "
            "onboarding platform. You will leverage recruiting and workforce data to build models that improve candidate "
            "matching, predict hiring outcomes, and surface insights that help companies make better people decisions.\n\n"
            "You will work closely with product managers, ML engineers, and business stakeholders to translate ambiguous "
            "questions into well-defined analytical projects. The role offers a unique opportunity to apply data science "
            "in a domain where your work directly impacts hiring equity and efficiency.\n\n"
            "This is a fully remote position. We support flexible working hours and async-first collaboration."
        ),
    },
]


class Command(BaseCommand):
    help = "Seed the database with initial job listings"

    def handle(self, *args, **options):
        created_count = 0
        for job_data in SEED_JOBS:
            _, created = Job.objects.get_or_create(
                title=job_data["title"],
                team=job_data["team"],
                defaults=job_data,
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"Created: {job_data['title']}"))
            else:
                self.stdout.write(self.style.WARNING(f"Already exists: {job_data['title']}"))

        self.stdout.write(self.style.SUCCESS(f"\nDone. {created_count} new job(s) seeded."))
