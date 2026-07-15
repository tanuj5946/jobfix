import { prisma } from '../config/database';

const catalog: Array<{ name: string; category: string }> = [
  ...['Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'PHP', 'Ruby', 'Kotlin', 'Swift'].map(name => ({ name, category: 'Programming Languages' })),
  ...['React', 'Angular', 'Vue.js', 'Next.js', 'Node.js', 'Express.js', 'Django', 'Flask', 'FastAPI', 'Spring Boot', '.NET'].map(name => ({ name, category: 'Frameworks' })),
  ...['HTML', 'CSS', 'Tailwind CSS', 'Bootstrap', 'Redux', 'REST APIs', 'GraphQL', 'Microservices'].map(name => ({ name, category: 'Web Development' })),
  ...['SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 'DBMS', 'Data Modeling', 'ETL', 'Apache Airflow'].map(name => ({ name, category: 'Databases & Data Engineering' })),
  ...['Excel', 'Advanced Excel', 'Power BI', 'Tableau', 'Google Sheets', 'Data Visualization', 'Statistics', 'Data Cleaning', 'Pandas', 'NumPy'].map(name => ({ name, category: 'Data Analytics' })),
  ...['Machine Learning', 'Deep Learning', 'scikit-learn', 'TensorFlow', 'PyTorch', 'Natural Language Processing', 'Computer Vision', 'Data Science'].map(name => ({ name, category: 'AI & Machine Learning' })),
  ...['AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'CI/CD', 'Linux', 'Nginx'].map(name => ({ name, category: 'Cloud & DevOps' })),
  ...['Git', 'GitHub', 'Agile', 'Scrum', 'Jira', 'Unit Testing', 'Integration Testing', 'Selenium', 'Postman', 'Cypress'].map(name => ({ name, category: 'Engineering Practices' })),
  ...['Data Structures', 'Algorithms', 'OOPS Concept', 'System Design', 'Operating System', 'Computer Networks', 'Software Design Patterns', 'Problem Solving'].map(name => ({ name, category: 'Computer Science Fundamentals' })),
  ...['Figma', 'UI Design', 'UX Research', 'Wireframing', 'Prototyping', 'Accessibility'].map(name => ({ name, category: 'Design' })),
  ...['Android Development', 'iOS Development', 'React Native', 'Flutter'].map(name => ({ name, category: 'Mobile Development' })),
];

export async function seedSkillCatalog() {
  return prisma.skill.createMany({ data: catalog, skipDuplicates: true });
}
