import { randomUUID } from "node:crypto";
import { count, eq, inArray } from "drizzle-orm";
import { loadEnv, log } from "./lib";
import { db } from "@/server/db/client";
import {
  academicPage,
  account,
  announcement,
  article,
  category,
  event,
  facultyProfile,
  sitePage,
  siteSetting,
  tag,
  user,
} from "@/server/db/schema";
import { auth } from "@/server/auth";
import { slugify } from "@/server/ids";
import { DEFAULT_SETTINGS, SETTINGS_KEY } from "@/server/settings";
import { team } from "@/content/team";
import {
  adminDecision,
  createArticle,
  editorialApprove,
  publishNow,
  startEditorialReview,
  submitForReview,
} from "@/server/workflow/service";

loadEnv();

const categories = [
  { slug: "campus", name: "Campus News", kind: "campus", description: "News and events from the University of Liberia campus.", order: 1 },
  { slug: "university", name: "University News", kind: "university", description: "Administration, academic affairs and campus life at the University of Liberia.", order: 2 },
  { slug: "national", name: "National News", kind: "national", description: "Reporting on national issues that affect students and the wider public.", order: 3 },
  { slug: "education", name: "Education", kind: "education", description: "Teaching, learning and education policy in Liberia.", order: 4 },
  { slug: "opinion", name: "Opinion", kind: "opinion", description: "Commentary, analysis and letters from our writers and readers.", order: 5 },
  { slug: "sports", name: "Sports", kind: "sports", description: "Campus and national sport, told by student journalists.", order: 6 },
  { slug: "features", name: "Features", kind: "features", description: "Long-form reporting, profiles and human stories.", order: 7 },
  { slug: "multimedia", name: "Multimedia", kind: "multimedia", description: "Video, audio, photography and visual storytelling.", order: 8 },
  { slug: "editorial", name: "Editorial", kind: "editorial", description: "The editorial voice of The Varsity Pilot.", order: 9 },
  { slug: "community", name: "Community News", kind: "community", description: "Stories from the communities around the University of Liberia.", order: 10 },
  { slug: "media-society", name: "Media & Society", kind: "media_society", description: "Media, democracy and public life in Liberia.", order: 11 },
  { slug: "research", name: "Research", kind: "research", description: "Research and public scholarship from the department.", order: 12 },
];

const aboutHtml = `
<p><strong>In 1983</strong>, the University of Liberia, with funding from UNESCO, established the Mass Communication Department to meet the growing demand for professionally trained personnel in Liberia's broadcast and print media. The Department was founded with a clear mission: to equip communication professionals with the knowledge, skills and ethical grounding required to provide accurate, credible and trustworthy news and information to the public.</p>
<p>At its inception, the Department was led by Professor T. Nelson Williams, an accomplished media practitioner and educator who served as its first chairman. He was joined by a pioneering team of recent graduates who had earned advanced degrees in media studies in the United States. Among them were Associate Professors Alhaji G. V. Kromah, Lamini A. Warritay and Weade Kobbah-Boley, who today serves as a vice president at the University of Liberia. Joe W. Mulbah, initially appointed as a teaching assistant, later pursued advanced studies in the United Kingdom, returned as an assistant professor and subsequently rose to serve as chairman of the Department.</p>
<h2>Growth and reputation</h2>
<p>Since its founding, the Department has grown into Liberia's largest and most recognised centre for the training of aspiring journalists and communication professionals. Guided by a commitment to excellence, professionalism and the highest ethical standards of journalism, the Department has become a leading source of skilled communicators serving the media, government and corporate institutions.</p>
<p>The Department offers a Bachelor of Arts degree in Communication and Media, with specialised tracks in print and broadcast journalism. A hallmark of the programme is its emphasis on practical learning: students write articles for <em>The Varsity Pilot</em> newspaper, both online and print, and produce programmes and news content for Lux FM 106.6, the student-operated radio station.</p>
<h2>Looking ahead</h2>
<p>In 2021, the Department undertook a comprehensive curriculum revision to address contemporary gaps in the field and evolving societal needs. At the same time, it transitioned from the Mass Communication Department to its current name, the Department of Communication and Media Studies. This change marked the first step in a broader, gradual transformation into a full School of Communication.</p>
<p>The envisioned School will introduce multiple career tracks and areas of specialisation, enabling students to pursue focused and advanced learning. Through this evolution, graduates will be better equipped to build strong professional careers, positioning them as attractive and resourceful contributors to future employers and to the wider communication landscape.</p>
<h2>Our mission</h2>
<p>Our mission is to prepare students for professional careers in communication and journalism by equipping them with the digital competencies, ethical grounding and critical thinking skills essential to thrive in an evolving media and communication landscape. We are committed to positioning students to sufficiently and effectively contribute to knowledge in the fields of journalism and communication through rigorous research and scholarship, thereby advancing both professional practice and academic inquiry.</p>
<h2>Our vision</h2>
<p>Our vision is to evolve into a distinguished School of Communication that serves as a national and regional hub for excellence in media and communication education and research. We aspire to cultivate a new generation of journalists, scholars and communication professionals who embody integrity, innovation and leadership.</p>
`;

const contactHtml = `
<p>The Department of Communication and Media Studies is located in the MassComm Building at the University of Liberia's Fendell Campus in Louisiana, Montserrado County.</p>
<p>For general enquiries, email <a href="mailto:masscommdept@ul.edu.lr">masscommdept@ul.edu.lr</a> or call <a href="tel:+231777463864">+231 777 463 864</a>. The Chairman, Euriahs M. Togar, can be reached at <a href="mailto:togarem@ul.edu.lr">togarem@ul.edu.lr</a>.</p>
<p>For story tips, letters to the editor and newsroom corrections, contact The Varsity Pilot editorial team through the department office.</p>
`;

const admissionsHtml = `
<p>The Department offers a Bachelor of Arts degree in Communication and Media, with specialised tracks in print and broadcast journalism. Admission to University of Liberia programmes is handled by the University.</p>
<p>Prospective students should use the official University of Liberia admissions process. For guidance about the department's programme, contact the department office at <a href="mailto:masscommdept@ul.edu.lr">masscommdept@ul.edu.lr</a> or <a href="tel:+231777463864">+231 777 463 864</a>.</p>
`;

const academics = [
  {
    slug: "ba-communication-media",
    title: "BA in Communication and Media",
    kind: "undergraduate",
    summary:
      "A four-year liberal arts degree combining communication theory with professional training in print and broadcast journalism.",
    bodyHtml: `
<p>The Department of Communication and Media Studies offers a Bachelor of Arts degree in Communication and Media. The programme combines a broad liberal arts foundation with professional training in reporting, writing, editing, media law and ethics, production and communication research.</p>
<p>Students choose a specialised track in print journalism or broadcast journalism. Practical learning is central: students write for <em>The Varsity Pilot</em> and produce programmes and news content for Lux FM 106.6, the student-operated radio station.</p>
<p>Following the 2021 curriculum revision, the Department is expanding career tracks and areas of specialisation as part of its transition into a full School of Communication.</p>
`,
    order: 0,
  },
  {
    slug: "print-journalism",
    title: "Print Journalism Track",
    kind: "track",
    summary:
      "Reporting, writing, editing, photography and publication design for newspapers and digital platforms.",
    bodyHtml: `
<p>The print journalism track prepares students for careers in newspapers, magazines and digital newsrooms. Coursework covers news reporting, feature writing, editing, photojournalism, publication design and media ethics.</p>
<p>Students practise their craft at <em>The Varsity Pilot</em>, the Department's student-run newspaper, in both its online and print editions.</p>
`,
    order: 1,
  },
  {
    slug: "broadcast-journalism",
    title: "Broadcast Journalism Track",
    kind: "track",
    summary:
      "Radio and television reporting, production, announcing and broadcast management.",
    bodyHtml: `
<p>The broadcast journalism track prepares students for radio and television newsrooms. Students learn reporting, scripting, production, announcing and broadcast management.</p>
<p>Hands-on training takes place at Lux FM 106.6, the student-operated radio station, where students produce programmes and news content under supervision.</p>
`,
    order: 2,
  },
  {
    slug: "practical-learning",
    title: "Practical learning: The Varsity Pilot and Lux FM",
    kind: "other",
    summary:
      "Every student gains real newsroom and broadcast experience before graduation.",
    bodyHtml: `
<p>Professional training at the Department is built around practice. Students are required to write articles for <em>The Varsity Pilot</em> newspaper, both online and print, and to produce programmes and news content for Lux FM 106.6.</p>
<p>These platforms provide opportunities to apply classroom knowledge in real newsroom and broadcast settings, cultivating professional competence and ethical responsibility.</p>
`,
    order: 3,
  },
];

async function ensureSeedUser(input: { email: string; name: string; role: "staff" | "editor" | "admin"; title: string; password?: string }) {
  let [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, input.email)).limit(1);
  if (!existing) {
    [existing] = await db
      .insert(user)
      .values({
        id: randomUUID(),
        email: input.email,
        name: input.name,
        role: input.role,
        title: input.title,
        slug: slugify(input.name),
        emailVerified: true,
      })
      .returning({ id: user.id });
  }
  if (!existing) throw new Error(`Could not create seed user ${input.email}`);
  if (input.password) {
    const [credential] = await db
      .select({ id: account.id })
      .from(account)
      .where(eq(account.userId, existing.id))
      .limit(1);
    if (!credential) {
      const passwordHash = await (await auth.$context).password.hash(input.password);
      await db.insert(account).values({
        id: randomUUID(),
        accountId: existing.id,
        providerId: "credential",
        userId: existing.id,
        password: passwordHash,
      });
    }
  }
  return existing;
}

async function seedPublicDemoContent() {
  const writer = await ensureSeedUser({
    email: "amara.kamara@ulmc.demo",
    name: "Amara Kamara",
    role: "staff",
    title: "Student Reporter",
  });
  const editor = await ensureSeedUser({
    email: "daniel.sesay@ulmc.demo",
    name: "Daniel Sesay",
    role: "editor",
    title: "News Editor",
  });
  const admin = await ensureSeedUser({
    email: "grace.taylor@ulmc.demo",
    name: "Grace Taylor",
    role: "admin",
    title: "Managing Editor",
    password: process.env.DEMO_ADMIN_PASSWORD ?? "ChangeMe123456!",
  });

  const categoryRows = await db.select({ id: category.id, slug: category.slug }).from(category);
  const categoryId = new Map(categoryRows.map((row) => [row.slug, row.id]));
  const stories = [
    {
      slug: "student-reporters-open-community-media-desk",
      title: "Student reporters open a community media desk at Fendell",
      summary: "The new weekly desk gives students a practical place to report campus issues, interview residents and publish verified updates.",
      category: "campus",
      contentType: "student" as const,
      bodyHtml: "<p>Student journalists at the Department of Communication and Media Studies have opened a weekly community media desk at Fendell Campus. The desk connects classroom reporting with the questions students and nearby residents want answered.</p><p>Each edition is produced with faculty guidance and published after the newsroom's editorial review process. The project is designed to strengthen reporting, listening and public-service journalism.</p>",
    },
    {
      slug: "media-lab-expands-digital-storytelling-training",
      title: "Media lab expands digital storytelling training for the new semester",
      summary: "A refreshed newsroom lab is giving students more space to practise mobile reporting, audio editing and audience-first publishing.",
      category: "education",
      contentType: "education" as const,
      bodyHtml: "<p>The Department's media lab is beginning the semester with new practical sessions in mobile reporting, audio production and visual storytelling. Students will use the lab to develop reporting projects for The Varsity Pilot and Lux FM.</p><p>Faculty members say the work is focused on the habits that matter in a modern newsroom: accuracy, accessibility, strong sourcing and a clear understanding of audience needs.</p>",
    },
    {
      slug: "campus-debate-asks-how-young-people-can-shape-public-life",
      title: "Campus debate asks how young people can shape public life",
      summary: "Students and guests gathered for a lively conversation about public trust, civic participation and the responsibility of the media.",
      category: "media-society",
      contentType: "feature" as const,
      bodyHtml: "<p>A packed campus forum brought students, journalists and civil-society guests together to discuss how young people can take part in public life. Speakers returned repeatedly to the value of verified information and respectful disagreement.</p><p>Participants left with a practical challenge: ask better questions, listen to competing views and use media platforms to serve communities rather than simply chase attention.</p>",
    },
    {
      slug: "varsity-pilot-sports-desk-looks-ahead-to-interfaculty-games",
      title: "Varsity Pilot sports desk looks ahead to the interfaculty games",
      summary: "Student reporters are preparing live updates and profiles as teams across the University of Liberia begin a new interfaculty season.",
      category: "sports",
      contentType: "campus" as const,
      bodyHtml: "<p>The interfaculty games are returning with a full schedule of football, basketball and athletics. The Varsity Pilot sports desk will cover the competition with match reports, photo essays and conversations with student athletes.</p><p>Editors say the coverage will focus on the people behind the scorelines as well as the results.</p>",
    },
    {
      slug: "why-campus-newsrooms-still-matter",
      title: "Why campus newsrooms still matter",
      summary: "A strong student newsroom gives emerging journalists the space to learn accountability, empathy and the discipline of getting the story right.",
      category: "opinion",
      contentType: "opinion" as const,
      bodyHtml: "<p>Campus journalism is more than an extracurricular activity. It is a public-service laboratory where young reporters learn to check facts, seek out people affected by decisions and correct mistakes openly.</p><p>When student reporting is supported with careful editing and ethical standards, it makes the university community more informed and more connected.</p>",
    },
  ];

  for (const story of stories) {
    const [existing] = await db
      .select({
        id: article.id,
        workflowStatus: article.workflowStatus,
        publishedRevisionId: article.publishedRevisionId,
        workingRevisionId: article.workingRevisionId,
      })
      .from(article)
      .where(eq(article.slug, story.slug))
      .limit(1);
    if (existing) {
      if (!existing.publishedRevisionId && existing.workflowStatus === "admin_approved" && existing.workingRevisionId) {
        await publishNow(admin.id, { articleId: existing.id, revisionId: existing.workingRevisionId });
      }
      continue;
    }
    const categoryIdForStory = categoryId.get(story.category);
    if (!categoryIdForStory) throw new Error(`Missing seed category ${story.category}`);
    const created = await createArticle(writer.id, {
      title: story.title,
      summary: story.summary,
      bodyHtml: story.bodyHtml,
      categoryId: categoryIdForStory,
      contentType: story.contentType,
      authorIds: [writer.id],
      tagNames: ["varsity pilot", "campus", "journalism"],
      slug: story.slug,
    });
    await submitForReview(writer.id, { articleId: created.articleId, revisionId: created.revisionId, expectedVersion: 1 });
    await startEditorialReview(editor.id, { articleId: created.articleId, revisionId: created.revisionId });
    await editorialApprove(editor.id, {
      articleId: created.articleId,
      revisionId: created.revisionId,
      checklist: {
        sources_verified: true,
        image_rights: true,
        captions_credit: true,
        accessibility: true,
        quality: true,
      },
      note: "Seeded demonstration story reviewed for the public interface.",
    });
    await adminDecision(admin.id, { articleId: created.articleId, revisionId: created.revisionId, decision: "approve" });
    await publishNow(admin.id, { articleId: created.articleId, revisionId: created.revisionId });
  }

  const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const eventFixtures = [
    {
      slug: "open-newsroom-and-story-clinic",
      title: "Open Newsroom & Story Clinic",
      summary: "Bring a campus story idea, meet the Varsity Pilot desk and learn how to pitch, report and publish it.",
      venue: "MassComm Building, Fendell Campus",
      organizer: "The Varsity Pilot",
      startsAt,
    },
    {
      slug: "media-careers-conversation",
      title: "Media Careers: A Conversation with Practitioners",
      summary: "An evening conversation about building a responsible, creative career in journalism and communication.",
      venue: "University of Liberia Auditorium",
      organizer: "Department of Communication and Media Studies",
      startsAt: new Date(startsAt.getTime() + 7 * 24 * 60 * 60 * 1000),
    },
  ];
  for (const item of eventFixtures) {
    await db
      .insert(event)
      .values({
        ...item,
        descriptionHtml: `<p>${item.summary}</p>`,
        isPublished: true,
        isFeatured: true,
        createdBy: admin.id,
      })
      .onConflictDoUpdate({
        target: event.slug,
        set: { ...item, descriptionHtml: `<p>${item.summary}</p>`, isPublished: true, isFeatured: true, updatedAt: new Date() },
      });
  }
}

async function main() {
  const rows = await db.select({ value: count() }).from(user);
  const userCount = Number(rows[0]?.value ?? 0);
  if (userCount > 0) {
    log("seed", "Users exist; skipping credential bootstrap. Use /setup or invitations.");
  } else {
    const email = "editor@ulmc.local";
    const name = "Demo Editor";
    const password = "ChangeMe123456!";
    const ctx = await auth.$context;
    const passwordHash = await ctx.password.hash(password);
    const id = randomUUID();
    const slug = slugify(name);
    await db.insert(user).values({
      id,
      name,
      email,
      emailVerified: true,
      role: "editor",
      slug,
      title: "Managing Editor",
    });
    await db.insert(account).values({
      id: randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: passwordHash,
    });
    log("seed", `Created demo editor ${email} / ${password}`);
  }

  for (const c of categories) {
    await db
      .insert(category)
      .values({
        name: c.name,
        slug: c.slug,
        kind: c.kind,
        description: c.description,
        orderIndex: c.order,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: category.slug,
        set: {
          name: c.name,
          kind: c.kind,
          description: c.description,
          orderIndex: c.order,
          isActive: true,
          updatedAt: new Date(),
        },
      });
  }

  await seedPublicDemoContent();

  const tags = ["varsity pilot", "journalism", "liberia", "university of liberia", "campus", "media"];
  for (const t of tags) {
    const s = slugify(t);
    await db
      .insert(tag)
      .values({ name: t, slug: s })
      .onConflictDoNothing({ target: tag.slug });
  }

  const pages = [
    { slug: "about", title: "About the Department", section: "about", bodyHtml: aboutHtml, order: 0 },
    { slug: "contact", title: "Contact", section: "contact", bodyHtml: contactHtml, order: 1 },
    { slug: "admissions", title: "Admissions", section: "admissions", bodyHtml: admissionsHtml, order: 2 },
  ];
  for (const p of pages) {
    await db
      .insert(sitePage)
      .values({
        slug: p.slug,
        title: p.title,
        section: p.section,
        bodyHtml: p.bodyHtml,
        isPublished: true,
        orderIndex: p.order,
      })
      .onConflictDoUpdate({
        target: sitePage.slug,
        set: {
          title: p.title,
          section: p.section,
          bodyHtml: p.bodyHtml,
          orderIndex: p.order,
          isPublished: true,
          updatedAt: new Date(),
        },
      });
  }

  for (const page of academics) {
    await db
      .insert(academicPage)
      .values({
        slug: page.slug,
        title: page.title,
        kind: page.kind,
        summary: page.summary,
        bodyHtml: page.bodyHtml,
        orderIndex: page.order,
        isPublished: true,
      })
      .onConflictDoUpdate({
        target: academicPage.slug,
        set: {
          title: page.title,
          kind: page.kind,
          summary: page.summary,
          bodyHtml: page.bodyHtml,
          orderIndex: page.order,
          isPublished: true,
          updatedAt: new Date(),
        },
      });
  }

  const demoFaculty = [
    "dr-emmanuel-s-wettee",
    "ms-comfort-k-toe",
    "mr-abraham-b-paye",
    "ms-hawa-m-sheriff",
  ];
  await db.delete(facultyProfile).where(inArray(facultyProfile.slug, demoFaculty));

  const people = team.filter(
    (member) => member.group === "leadership" || member.group === "advisory",
  );
  for (const [index, person] of people.entries()) {
    const slug = slugify(person.name);
    const isChair = person.group === "leadership";
    await db
      .insert(facultyProfile)
      .values({
        slug,
        name: person.name,
        role: person.role,
        bio: person.bio,
        email: person.email ?? null,
        phone: person.phone ?? null,
        office: isChair ? "MassComm Building, Fendell Campus" : "Department of Communication and Media Studies",
        teachingInterests: isChair
          ? "Journalism, broadcast management, digital media, public relations"
          : "Journalism ethics, reporting and newsroom practice",
        researchInterests: isChair
          ? "Digital media, youth smartphone use, digital parenting, journalism and public relations in Liberia"
          : null,
        orderIndex: index,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: facultyProfile.slug,
        set: {
          name: person.name,
          role: person.role,
          bio: person.bio,
          email: person.email ?? null,
          phone: person.phone ?? null,
          office: isChair ? "MassComm Building, Fendell Campus" : "Department of Communication and Media Studies",
          orderIndex: index,
          isActive: true,
          updatedAt: new Date(),
        },
      });
  }

  await db
    .insert(siteSetting)
    .values({ key: SETTINGS_KEY, value: DEFAULT_SETTINGS })
    .onConflictDoNothing({ target: siteSetting.key });

  const welcome = "Welcome to The Varsity Pilot online — the student newspaper of the Department of Communication and Media Studies.";
  const existing = await db
    .select({ id: announcement.id })
    .from(announcement)
    .where(eq(announcement.message, welcome))
    .limit(1);
  if (!existing[0]) {
    await db.insert(announcement).values({
      message: welcome,
      level: "info",
      linkLabel: "Read our story",
      linkUrl: "/student-journalism",
      isActive: true,
    });
  }

  log("seed", "Seed complete");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
