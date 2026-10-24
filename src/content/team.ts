export type TeamMember = {
  name: string;
  role: string;
  group: "leadership" | "editorial" | "advisory";
  bio: string;
  phone?: string;
  email?: string;
};

export const departmentContact = {
  department: "Department of Communication and Media Studies",
  institution: "University of Liberia",
  email: "masscommdept@ul.edu.lr",
  chairmanEmail: "togarem@ul.edu.lr",
  phone: "+231 777 463 864",
  address: "MassComm Building, Fendell Campus, Louisiana, Montserrado, Liberia",
  facebook: "https://www.facebook.com/share/1Dhmv8YzXS/?mibextid=wwXIfr",
};

export const team: TeamMember[] = [
  {
    name: "Euriahs M. Togar",
    role: "Chairman, Department of Communication and Media Studies",
    group: "leadership",
    bio: "Euriahs M. Togar is an Assistant Professor and Chair of the Department of Communication and Media Studies, formerly the Mass Communication Department, at the University of Liberia. An academic and media professional, he brings experience in journalism, broadcast management, curriculum development and student mentorship. He holds a master's degree in communication and information sciences from Tilburg University in the Netherlands, where he is pursuing a PhD. His research examines digital media, youth smartphone use, digital parenting, and journalism and public relations in Liberia. A former Station Manager of Lux FM, he has also served on the Press Union of Liberia's National Media Council, contributing to media ethics and accountability.",
    phone: "+231 777 463 864",
    email: "togarem@ul.edu.lr",
  },
  {
    name: "Mr. Senyon Kieh",
    role: "Editor-in-Chief and Copy Editor, The Varsity Pilot",
    group: "editorial",
    bio: "Senyon Kieh leads The Varsity Pilot newsroom and oversees the newspaper's editorial operations. He approves content and checks accuracy, grammar, clarity and consistency across student reporting.",
    phone: "+231 777 435 631",
  },
  {
    name: "Moses Kpakolo",
    role: "News Editor and Digital & Social Media Editor",
    group: "editorial",
    bio: "Moses Kpakolo guides reporters, edits stories, publishes reporting online and engages readers across the newspaper's digital and social platforms.",
    phone: "+231 770 351 357",
  },
  {
    name: "Moses Cole",
    role: "Multimedia Editor",
    group: "editorial",
    bio: "Moses Cole handles photography, video and other visual content for The Varsity Pilot, supporting the newspaper's shift to multimedia storytelling.",
    phone: "+231 770 351 357",
  },
  {
    name: "Nicholas Dweh Nimely",
    role: "Faculty Adviser, The Varsity Pilot",
    group: "advisory",
    bio: "Nicholas Dweh Nimely provides mentorship and ethical guidance to the student editorial team, helping to uphold professional standards in every story the newspaper publishes.",
    phone: "+231 776 586 433",
  },
];

export const teamGroups: { key: TeamMember["group"]; title: string; description: string }[] = [
  {
    key: "leadership",
    title: "Department leadership",
    description: "Academic leadership guiding teaching, research and the department's transition to a School of Communication.",
  },
  {
    key: "editorial",
    title: "The Varsity Pilot editorial team",
    description: "Student editors responsible for the newspaper's reporting, editing, publishing and visual storytelling.",
  },
  {
    key: "advisory",
    title: "Faculty advisory",
    description: "Faculty support for ethical guidance and professional mentorship.",
  },
];

export const coreValues = [
  { title: "Excellence", body: "We uphold the highest academic and professional standards in teaching, research and practice." },
  { title: "Integrity", body: "We instill ethical responsibility and honesty as the foundation of journalism and communication." },
  { title: "Innovation", body: "We embrace creativity, adaptability and digital competencies to thrive in a rapidly evolving media landscape." },
  { title: "Scholarship", body: "We advance knowledge through rigorous research, critical inquiry and intellectual contribution to communication and journalism." },
  { title: "Professionalism", body: "We prepare graduates to serve with competence, discipline and respect in diverse media, governmental and corporate environments." },
  { title: "Service", body: "We commit to using communication as a tool for social impact, empowering communities and strengthening democratic values." },
  { title: "Collaboration", body: "We foster partnerships and teamwork across disciplines, institutions and industries to enrich learning and practice." },
];

export const pilotObjectives = [
  "Inform the University and the Nation — deliver accurate, timely and balanced reporting on campus events, university developments and broader national issues that affect society.",
  "Provide Practical Journalism Experience — help students develop professional skills in reporting, writing, editing, photography, design and digital publishing.",
  "Uphold Ethical Standards — promote accuracy, fairness, independence, accountability and respect for diverse perspectives in all journalistic work.",
  "Amplify Student Voices — offer an inclusive forum for students to share ideas, express concerns and contribute meaningfully to university life and national discourse.",
  "Encourage Critical Thinking and Dialogue — stimulate thoughtful engagement through news coverage, analysis, editorials and commentary on campus and national issues.",
  "Promote Transparency and Accountability — examine matters that affect students, the wider university community and the broader public with rigor and responsibility.",
  "Prepare for an Evolving Media Landscape — foster creativity, collaboration and the responsible use of emerging media technologies to equip students for future careers.",
];

export const pilotCoreValues = [
  { title: "Excellence in Training", body: "We commit to high standards of reporting, writing and newsroom practice as part of academic learning." },
  { title: "Integrity and Ethics", body: "We uphold accuracy, fairness, accountability and respect for diverse perspectives." },
  { title: "Innovation and Adaptability", body: "We embrace digital tools and emerging media technologies to prepare students for the future of journalism." },
  { title: "Critical Inquiry", body: "We encourage analysis, debate and thoughtful engagement with issues that matter to the university and society." },
  { title: "Collaboration and Teamwork", body: "We foster a cooperative newsroom culture that reflects professional media practice." },
  { title: "Service to Community", body: "We inform, empower and connect university and national audiences through credible journalism." },
  { title: "Leadership Development", body: "We nurture students to become resourceful professionals and responsible communicators in Liberia and beyond." },
];
