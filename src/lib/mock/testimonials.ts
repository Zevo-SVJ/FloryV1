export interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "I had read my own bio four hundred times. Blink told me in nine seconds what every stranger was seeing instead.",
    name: "Mara Ellison",
    role: "Ceramicist, Lisbon",
  },
  {
    quote:
      "We ran it on eleven creators before a campaign. It predicted which three would convert, and it was right about all three.",
    name: "Devin Osei",
    role: "Brand Partnerships, Halden",
  },
  {
    quote:
      "The uncomfortable part is how specific it is. It didn't say be more professional. It said my second line was doing the damage.",
    name: "Yuki Tamura",
    role: "Architect",
  },
  {
    quote:
      "Changed the photo and one sentence. Follow rate went up by a third and nothing else about my work changed.",
    name: "Iris Vandermeer",
    role: "Photographer",
  },
];
