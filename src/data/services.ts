export interface Service {
  slug: string;
  title: string;
  shortTitle: string;
  heroImage: string;
  intro: string;
  services: string[];
  extras?: { title: string; items: string[] };
  process?: { title: string; steps: string[] };
  note?: string;
  galleryImages: string[];
}

export const SERVICES: Service[] = [
  {
    slug: "driveways",
    title: "Concrete Driveways",
    shortTitle: "Driveways",
    heroImage: "/images/driveways/driveway_4_big_house.jpeg",
    intro:
      "Your driveway is the first thing people see. It also takes a beating - vehicles, weather, tree roots, settling soil. When it's time for a new pour or a full replacement, we handle the job from demo to finish.",
    services: [
      "New driveway installation",
      "Driveway replacement",
      "Driveway extensions",
      "Driveway repair",
    ],
    process: {
      title: "Our Process",
      steps: [
        "Estimate visit - we walk the site and provide a written quote",
        "Scheduling - typically available to start within 2 weeks",
        "Demo - remove existing concrete or prep the area",
        "Base prep - grade, compact, prepare substrate",
        "Pour & finish",
        "Cure - typically 7 days before vehicle traffic",
      ],
    },
    galleryImages: [
      "/images/driveways/driveway_1_grey_garage.jpeg",
      "/images/driveways/driveway_2_grey_house.jpeg",
      "/images/driveways/driveway_3_white_garage.jpeg",
      "/images/driveways/driveway_5_modern_garage.jpeg",
      "/images/driveways/driveway_6_long_walk.jpeg",
      "/images/driveways/driveway_8_van.jpeg",
      "/images/driveways/wix_driveway_broom.jpeg",
      "/images/driveways/IMG_3538.jpeg",
      "/images/driveways/IMG_3541.jpeg",
    ],
  },
  {
    slug: "patios",
    title: "Concrete Patios",
    shortTitle: "Patios",
    heroImage: "/images/patios/patio_3_fountain.jpeg",
    intro:
      "A well-built patio extends your living space outdoors. Whether you want a simple slab for a grill and table or a larger entertaining area, we pour patios that last.",
    services: [
      "New patio installation",
      "Patio replacement",
      "Hot tub pads",
    ],
    extras: {
      title: "Finish Options",
      items: [
        "Standard broom finish",
        "Smooth trowel finish",
        "Exposed aggregate",
        "Stamped concrete",
      ],
    },
    galleryImages: [
      "/images/patios/patio_1_bw_chairs.jpeg",
      "/images/patios/patio_2_fence.jpeg",
      "/images/patios/patio_4_reddish.jpeg",
      "/images/patios/patio_5_grey_tiles.jpeg",
      "/images/patios/patio_6_big_tiles.jpeg",
      "/images/patios/patio_7_overhang.jpeg",
      "/images/stamped/stamped_decorative_2_rainy.jpeg",
      "/images/stamped/stamped_decorative_3_textured.jpeg",
      "/images/stamped/stamped_decorative_3_textured_curb_bump.jpeg",
      "/images/stamped/stamped_decorative_4_glass_doorsjpeg.jpeg",
      "/images/stamped/wix_stamped_patio_1.jpeg",
      "/images/stamped/wix_stamped_patio_2.jpeg",
    ],
  },
  {
    slug: "walkways-stairs",
    title: "Walkways & Stairs",
    shortTitle: "Walkways & Stairs",
    heroImage: "/images/walkways-stairs/walkways_stairs_1_blue_house.jpeg",
    intro:
      "Crumbling steps are a safety hazard and an eyesore. Cracked walkways make a bad first impression. We build and replace concrete walkways and stairs that hold up to Seattle's weather.",
    services: [
      "Front walkways",
      "Garden paths",
      "Entry stairs",
      "Stoop replacement",
    ],
    galleryImages: [
      "/images/walkways-stairs/walkways_stairs_1_blue_house.jpeg",
      "/images/walkways-stairs/walkways_stairs_3_black_tiles_rain.jpeg",
      "/images/walkways-stairs/walkways_stairs_4_grey_siding.jpeg",
      "/images/walkways-stairs/walkways_stairs_5_wood_walk.jpeg",
      "/images/walkways-stairs/walkways_stairs_8_tiny_sauna.jpeg",
      "/images/walkways-stairs/walkways_stairs_9_garden_blocks.jpeg",
      "/images/walkways-stairs/walkways_stairs_6_grass_bricks.jpeg",
      "/images/walkways-stairs/walkways_stairs_7_grass_winding.jpeg",
      "/images/walkways-stairs/walkways_stairs_11_grass_backyard_walk.jpeg",
      "/images/walkways-stairs/walkways_stairs_12_night_white_housejpeg.jpeg",
      "/images/walkways-stairs/walkways_stairs_15_down_stairs.jpeg",
      "/images/walkways-stairs/wix_pretty_stairs.jpeg",
      "/images/walkways-stairs/wix_more_pretty_stairs.jpeg",
      "/images/walkways-stairs/wix_long_stairs.jpeg",
      "/images/walkways-stairs/wix_overlay_walkway.jpeg",
      "/images/walkways-stairs/wix_basement_stairs.jpeg",
    ],
  },
  {
    slug: "retaining-walls",
    title: "Retaining Walls",
    shortTitle: "Retaining Walls",
    heroImage: "/images/walls/walls_7_retaining_wall.jpeg",
    intro:
      "Seattle's hills create beautiful views - and challenging yards. Retaining walls hold back soil, prevent erosion, and create usable flat space on sloped properties.",
    services: [
      "Structural retaining walls",
      "Yard leveling",
      "Erosion control",
      "Seawall & bulkhead repair",
    ],
    note: "Walls over 4 feet typically require permits and may need engineering. We work with structural requirements and coordinate with engineers when needed.",
    galleryImages: [
      "/images/walls/walls_2_base.jpeg",
      "/images/walls/walls_3_wood_drop.jpeg",
      "/images/walls/walls_4_joes.jpeg",
      "/images/walls/walls_5_blue_slope.jpeg",
      "/images/walls/walls_6_orange_sweatshirt.jpeg",
      "/images/walls/walls_9_white_balconies.jpeg",
      "/images/walls/walls_10_step_down.jpeg",
      "/images/walls/walls_11_grass_long.jpeg",
      "/images/walls/walls_12_new_steps.jpeg",
    ],
  },
  {
    slug: "foundation-work",
    title: "Foundations",
    shortTitle: "Foundations",
    heroImage: "/images/walls/walls_2_base.jpeg",
    intro:
      "A solid foundation is everything. Whether you need repairs to an existing foundation, a new slab for an ADU, or a garage foundation, we handle the job with precision.",
    services: [
      "Foundation repairs",
      "Crack sealing",
      "ADU foundations",
      "Addition foundations",
      "Garage slabs",
    ],
    note: "We coordinate with permits and inspections as needed.",
    galleryImages: [
      "/images/walls/walls_2_base.jpeg",
      "/images/other/other_3_close_up.jpeg",
      "/images/team/team_3_job_site.jpeg",
      "/images/other/other_4_bolt.jpeg",
      "/images/team/wix_garage_pour.jpeg",
    ],
  },
  {
    slug: "reconditioning",
    title: "Concrete Repair & Reconditioning",
    shortTitle: "Repair & Reconditioning",
    heroImage: "/images/before-after/after-stairs2.jpeg",
    intro:
      "Not every concrete surface needs to be torn out and replaced. If your existing concrete is structurally sound but looks worn, stained, or chipped, we can repair and recondition it - restoring the look and extending the life of your investment.",
    services: [
      "Concrete crack repair",
      "Surface restoration",
      "Settling and leveling fixes",
      "Stair and walkway reconditioning",
      "Color matching and staining",
      "Protective sealing",
    ],
    process: {
      title: "Our Reconditioning Process",
      steps: [
        "Remove all the damaged and compromised concrete",
        "Repair cracks and gaps with multiple coats of polymer-modified Concrete Patch by Ardex",
        "Apply a broom finish overlay of polymer-modified Concrete Dressing by Ardex",
        "Finish with multiple coats of color stain and sealer",
      ],
    },
    note: "Reconditioning works best on structurally sound concrete with surface-level wear. We'll always be honest about whether reconditioning or replacement is the right call for your situation.",
    galleryImages: [
      "/images/before-after/before-stairs.jpeg",
      "/images/before-after/after-stairs.jpeg",
      "/images/before-after/before-stairs2.jpeg",
      "/images/before-after/after-stairs2.jpeg",
      "/images/before-after/before-stairs3.jpeg",
      "/images/before-after/after-stairs3.jpeg",
      "/images/before-after/before-stairs4.jpeg",
      "/images/before-after/after-stairs4.jpeg",
    ],
  },
];

export const SERVICE_BRIEF = [
  {
    title: "Driveways",
    description: "New pours, replacements, extensions, and repairs.",
    slug: "driveways",
    image: "/images/driveways/driveway_4_big_house.jpeg",
  },
  {
    title: "Patios",
    description: "Backyard patios and outdoor living spaces.",
    slug: "patios",
    image: "/images/patios/patio_3_fountain.jpeg",
  },
  {
    title: "Walkways & Stairs",
    description: "Front walks, garden paths, steps, and stoops.",
    slug: "walkways-stairs",
    image: "/images/walkways-stairs/walkways_stairs_8_tiny_sauna.jpeg",
  },
  {
    title: "Retaining Walls",
    description: "Structural walls for hillsides and yard leveling.",
    slug: "retaining-walls",
    image: "/images/walls/walls_7_retaining_wall.jpeg",
  },
  {
    title: "Foundations",
    description: "Repairs, ADU foundations, and garage slabs.",
    slug: "foundation-work",
    image: "/images/walls/walls_2_base.jpeg",
  },
  {
    title: "Repair & Reconditioning",
    description: "Restore worn concrete without full replacement.",
    slug: "reconditioning",
    image: "/images/before-after/after-stairs2.jpeg",
  },
];
