export type PolicySection = { heading: string; paragraphs: string[]; bullets?: string[] };

export type Policy = {
  slug: string;
  title: string;
  kicker: string;
  lede: string;
  sections: PolicySection[];
};

export const POLICIES: Record<string, Policy> = {
  editorial: {
    slug: "editorial",
    kicker: "Standards",
    title: "Editorial standards",
    lede: "How the department's newsroom verifies, reviews and publishes reporting, features, opinion and student work.",
    sections: [
      {
        heading: "Scope",
        paragraphs: [
          "These standards apply to everything published in the department newsroom, including department news, faculty reporting, student journalism, opinion, multimedia and announcements. They also apply to content published on the department's social channels and newsletter.",
          "Every story passes through editorial review by an editor and final approval by a department administrator before it is published. Authors cannot approve their own work.",
        ],
      },
      {
        heading: "Accuracy and verification",
        paragraphs: [
          "We verify the facts we publish. Claims should be attributable to a named source, a document or direct observation. Where a claim cannot be verified, it must be attributed clearly and the limitation explained to readers.",
          "Statistics must cite their source and date. Documents should be linked or described precisely enough for readers to assess them. Photographs and video must not be altered in ways that change their meaning.",
        ],
        bullets: [
          "Seek primary sources and original documents wherever possible.",
          "Test and re-test technical or numerical claims before publication.",
          "Record the verification steps taken in the story's editorial checklist.",
          "Do not present speculation as fact.",
        ],
      },
      {
        heading: "Fairness and right of reply",
        paragraphs: [
          "People and organisations facing significant criticism should be given a meaningful opportunity to respond before publication, with enough detail to understand the allegation and enough time to reply.",
          "Where a response is not available, the story should say so. We report allegations as allegations and avoid language that presumes guilt.",
        ],
      },
      {
        heading: "Independence and conflicts",
        paragraphs: [
          "Editorial decisions are made independently of institutional public-relations priorities. Staff and student journalists must disclose any conflict of interest to the editor, including personal, financial or political relationships with subjects.",
          "Sponsored content, if published, is clearly labelled and kept separate from editorial judgement. Opinion pieces are labelled as opinion and do not represent the views of the University of Liberia.",
        ],
      },
      {
        heading: "Labelling",
        paragraphs: [
          "Readers should be able to tell what kind of content they are reading. The newsroom uses these labels:",
        ],
        bullets: [
          "Department news and reporting: reported and edited by the department newsroom.",
          "Opinion and analysis: the views of the named author.",
          "Student journalism: reported by students under editorial supervision.",
          "Sponsored: paid or partner content, clearly separated from editorial content.",
          "Announcement: official department or institutional information.",
        ],
      },
      {
        heading: "Sources and attribution",
        paragraphs: [
          "We prefer named sources. Anonymous sources may be used only where the information is of significant public interest and the source faces a credible risk, and only with the editor's agreement. The reader should be told why anonymity was granted.",
          "Quotations must be accurate. They may be trimmed for length but not altered in meaning. Paraphrase must be faithful to what was said.",
        ],
      },
      {
        heading: "Privacy and harm",
        paragraphs: [
          "We consider the potential harm of publication, particularly to vulnerable people, students and private individuals. We avoid publishing unnecessary personal details such as addresses, contact information or identifying information about minors.",
          "Sensitive reporting should include appropriate content notes and support information where relevant.",
        ],
      },
      {
        heading: "AI and automated tools",
        paragraphs: [
          "Automated tools may assist with transcription, research or production, but they do not replace verification or editorial judgement. A named human editor remains responsible for every published story. Images or audio generated or substantially altered with automated tools must be labelled.",
        ],
      },
      {
        heading: "Review and enforcement",
        paragraphs: [
          "The editorial team reviews these standards periodically. Complaints about published work are handled through the corrections process. Serious or repeated breaches may be escalated to the department head.",
        ],
      },
    ],
  },
  corrections: {
    slug: "corrections",
    kicker: "Accountability",
    title: "Corrections and clarifications",
    lede: "What to do if we get something wrong, and how we fix it.",
    sections: [
      {
        heading: "Our commitment",
        paragraphs: [
          "We correct errors promptly and clearly. A correction is not an admission of failure; it is part of doing the work honestly. We do not quietly delete or rewrite published stories to hide mistakes.",
        ],
      },
      {
        heading: "How to report an error",
        paragraphs: [
          "Use the contact form and choose “Newsroom correction”. Include the headline and URL of the story, the specific passage you believe is wrong, and any supporting information. If you are raising a factual dispute, please be as precise as possible.",
          "Messages are received by the department team. We aim to acknowledge correction requests during normal working hours.",
        ],
      },
      {
        heading: "What we correct",
        paragraphs: [
          "We correct factual errors, misleading statements, misattributed quotations and errors in names, titles, dates or figures. We may also add context where a story was accurate but liable to be misunderstood.",
        ],
        bullets: [
          "Minor typographical errors may be fixed silently.",
          "Factual errors receive a visible correction note with the date.",
          "Substantive changes receive an update note explaining what changed and why.",
          "If a story is withdrawn, the page explains why rather than simply disappearing.",
        ],
      },
      {
        heading: "How corrections appear",
        paragraphs: [
          "Corrections are appended to the story, showing the date and a plain description of what was corrected. The original publication date is preserved. Where a story is republished or syndicated, we ask partners to carry the correction.",
        ],
      },
      {
        heading: "Disagreements",
        paragraphs: [
          "If you disagree with our decision, you may ask for the matter to be reviewed by the department head. We will explain our reasoning, subject to privacy and legal limits.",
        ],
      },
    ],
  },
  comments: {
    slug: "comments",
    kicker: "Community",
    title: "Comments policy",
    lede: "How discussion works on this site, and the standards we apply to moderation.",
    sections: [
      {
        heading: "Moderation",
        paragraphs: [
          "Comments are reviewed before publication. Nothing appears automatically. Moderation is carried out by the editorial team against this policy, and decisions are recorded.",
          "Approved comments are published with the display name provided. Email addresses are never published and are used only for moderation and, where necessary, verification.",
        ],
      },
      {
        heading: "What is not allowed",
        paragraphs: ["We remove or decline comments that:"],
        bullets: [
          "Harass, threaten or abuse a person or group.",
          "Contain hate speech or discriminatory language.",
          "Reveal private personal information without consent.",
          "Make unsubstantiated allegations about identifiable people.",
          "Contain spam, advertising or repeated links.",
          "Impersonate another person or misrepresent an affiliation.",
          "Are off-topic or incomprehensible.",
        ],
      },
      {
        heading: "Editing",
        paragraphs: [
          "We may edit comments for length, clarity or to remove prohibited material. Where editing would change the meaning, we may decline the comment instead. We do not alter the substance of a comment and then attribute it to the author.",
        ],
      },
      {
        heading: "Identity and anonymity",
        paragraphs: [
          "Commenters must provide a working email address and a display name. We do not require real names, but we may decline comments where anonymity appears to be used to make unverified allegations.",
        ],
      },
      {
        heading: "Closing comments",
        paragraphs: [
          "Comments may be closed on stories after a period set by the department, or earlier where moderation capacity or safety requires it. Closed threads remain readable.",
        ],
      },
      {
        heading: "Appeals",
        paragraphs: [
          "If your comment was declined and you believe the decision was wrong, contact the editorial team with the comment text and the story URL. We will review the decision.",
        ],
      },
    ],
  },
  accessibility: {
    slug: "accessibility",
    kicker: "Access",
    title: "Accessibility statement",
    lede: "Our approach to making this website usable by as many people as possible.",
    sections: [
      {
        heading: "Our target",
        paragraphs: [
          "We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA. This includes keyboard access, visible focus states, sufficient colour contrast, readable text, labelled forms and alternatives for non-text content.",
        ],
      },
      {
        heading: "What we have done",
        paragraphs: ["The site is built with accessibility in mind from the start:"],
        bullets: [
          "Semantic headings, landmarks and a skip-to-content link.",
          "Keyboard-operable navigation and visible focus indicators.",
          "Form fields with explicit labels, hints and error messages.",
          "Respect for reduced-motion preferences.",
          "Text alternatives for images where meaning is conveyed.",
          "Colour contrast checked against WCAG AA thresholds.",
          "Responsive layouts that work at increased zoom and on small screens.",
        ],
      },
      {
        heading: "Known limitations",
        paragraphs: [
          "Third-party embeds, such as video players and social posts, may not fully meet our accessibility standards. Where possible we provide captions, transcripts or a text summary. Some archived documents may not be available in accessible formats.",
        ],
      },
      {
        heading: "Feedback and alternative formats",
        paragraphs: [
          "If you encounter a barrier, or need a document in another format, use the contact form and choose “Accessibility feedback”. Tell us the page and what you were trying to do. We will respond and, where possible, provide the information in an accessible alternative.",
        ],
      },
      {
        heading: "Ongoing work",
        paragraphs: [
          "Accessibility is an ongoing process. We review new features before launch and welcome reports about problems we have missed.",
        ],
      },
    ],
  },
};
