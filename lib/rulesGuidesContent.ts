export type RuleStatus = 'allowed' | 'conditional' | 'prohibited';

export type RuleClass = {
  slug: string;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  summary: string;
  skillLevel: string;
  philosophy: string;
  allowed: string[];
  conditional: string[];
  prohibited: string[];
  inspection: string[];
};

export type GuideTable = {
  headers: string[];
  rows: string[][];
};

export type GuideSection = {
  title: string;
  intro?: string;
  bullets?: string[];
  callout?: string;
  table?: GuideTable;
};

export type GuideTopic = {
  slug: string;
  title: string;
  icon: string;
  color: string;
  summary: string;
  audience: string;
  sections: GuideSection[];
};

export const RULEBOOK_VERSION = {
  version: '1.0',
  effectiveDate: '30 July 2026',
  reviewedAgainst: 'Tamiya Official Regulations (December 2025) and Stock Class update (May 2026)',
};

export const OFFICIAL_SOURCES = [
  {
    label: 'Tamiya Official Mini 4WD Race Regulations',
    href: 'https://www.tamiya.com/english/mini4wd/regulation.htm',
    type: 'Primary rule baseline',
  },
  {
    label: 'Tamiya Official Stock Class Regulations',
    href: 'https://www.tamiya.com/english/mini4wd/regulation_stockclass.html',
    type: 'Primary no-cut class baseline',
  },
  {
    label: 'Basic-MAX GP Regulations v5.0',
    href: 'https://basic-max.com/2026/05/13/bmaxgp-regu-v5/',
    type: 'B-Max reference',
  },
  {
    label: 'Mini4WDRacing educational guides',
    href: 'https://mini4wdracing.com/',
    type: 'Topic inspiration only',
  },
];

export const MACHINE_LIMITS = [
  ['Maximum length', 'Under 165 mm'],
  ['Maximum width', 'Under 105 mm'],
  ['Maximum height', 'Under 70 mm'],
  ['Minimum ground clearance', 'At least 1 mm'],
  ['Minimum weight', 'At least 90 g including batteries and motor'],
  ['Tire diameter', '22–35 mm'],
  ['Tire width', '8–26 mm'],
  ['Drive system', 'Four-wheel drive only'],
];

export const GENERAL_RULES = [
  {
    icon: '📐',
    title: 'Dimensions and construction',
    text: 'Cars must remain four-wheel drive, carry a recognizable and securely attached body, and pass the published size, weight, tire and clearance limits.',
  },
  {
    icon: '🔋',
    title: 'Batteries',
    text: 'AA alkaline or NiMH batteries are allowed. Battery labels and wrapping must remain visible and undamaged. Lithium cells and altered battery wraps are prohibited.',
  },
  {
    icon: '⚙️',
    title: 'Motors and gearing',
    text: 'Motors must be genuine, unopened and legal for the chassis and class. All running gears must use a manufacturer-supported ratio for that chassis.',
  },
  {
    icon: '🧰',
    title: 'Tamiya parts baseline',
    text: 'Race-car components must be genuine Tamiya Mini 4WD, R/C Mini 4WD or Dangun Racer parts unless a class rule explicitly says otherwise. Homemade and 3D-printed on-car parts are prohibited.',
  },
  {
    icon: '🛡️',
    title: 'Track and racer safety',
    text: 'Sharp exposed shafts, dangerous projections, loose components, leaking oil or grease, and anything likely to damage the course are prohibited.',
  },
  {
    icon: '🔍',
    title: 'Inspection authority',
    text: 'Every entry must pass inspection. Officials may reinspect at any time, and the race director has final authority over configurations not specifically covered.',
  },
  {
    icon: '🏁',
    title: 'Starting and course-out',
    text: 'Cars are dropped vertically at the start signal. Pushing or throwing is prohibited. A course-out, lane jump, rollover or detached body ends that run.',
  },
  {
    icon: '🤝',
    title: 'Fair play',
    text: 'Do not touch the course or another car, obstruct race operations, alter a car after inspection, or behave in a way that compromises fair competition.',
  },
];

export const MOTOR_MATRIX = [
  ['Kit-included normal motor', '✅', '✅', '✅', '✅', 'Must match the chassis type'],
  ['Rev / Torque / Atomic-Tuned (single-shaft or PRO)', '❌', '❌', '✅', '✅', 'Use the correct single- or dual-shaft version'],
  ['Light-Dash / Light-Dash PRO', '❌', '❌', '✅', '✅', 'Track control is still required'],
  ['Hyper-Dash 3 / Hyper-Dash PRO', '❌', '❌', '✅', '✅', 'Legal only when compatible with the chassis'],
  ['Power-Dash / Sprint-Dash', '❌', '❌', '✅', '✅', 'Single-shaft chassis only'],
  ['Mach-Dash PRO', '❌', '❌', '✅', '✅', 'PRO chassis only'],
  ['Ultra-Dash / Plasma-Dash', '❌', '❌', '❌', '❌', 'Not included in the club legal-motor list'],
  ['Opened, rewound, altered or cap-removed motor', '❌', '❌', '❌', '❌', 'Immediate inspection failure'],
];

export const RULE_CLASSES: RuleClass[] = [
  {
    slug: 'box-stock',
    name: 'Box Stock',
    shortName: 'Box Stock',
    icon: '📦',
    color: '#22C55E',
    summary: 'Build the kit as supplied and race it without performance upgrades.',
    skillLevel: 'Beginner',
    philosophy: 'Assembly quality, straightness and driving preparation—not purchased upgrades—decide the result.',
    allowed: [
      'The exact chassis, body, wheels, tires, gears, rollers and normal motor supplied in the kit.',
      'Kit grease and normal assembly consumables used according to the instructions.',
      'Painting, decals and cosmetic finishing that do not change performance or dimensions.',
      'Replacement of a damaged component with the same Tamiya part, geometry and material after official approval.',
      'Basic cleaning, alignment and screw tightening before inspection.',
    ],
    conditional: [
      'A replacement body, chassis or wheel color is allowed only when it is the same mold, material and specification and is approved before race day.',
      'Minor body trimming is allowed only when the kit instructions require it or an official confirms it is necessary for normal fitment.',
    ],
    prohibited: [
      'Starter-pack, advance-pack or Grade-Up performance parts.',
      'Changing the motor, gear ratio, roller type, bearing type, wheel type or tire compound.',
      'Cutting, drilling, countersinking, sanding, shaving, stretching or piercing race-car parts.',
      'Adding weights, dampers, brakes, plates, stabilizers, tape-based tuning or extra rollers.',
      'Mixing parts from another kit to create a performance advantage.',
    ],
    inspection: [
      'Kit identity and chassis/body pairing',
      'Supplied normal motor and stock gear ratio',
      'Stock wheels, tires and rollers',
      'No added tuning parts or modified components',
      'Body securely attached and car within general measurements',
    ],
  },
  {
    slug: 'open-box-stock',
    name: 'Open Box Stock',
    shortName: 'Open Box',
    icon: '🔓',
    color: '#3B82F6',
    summary: 'Box Stock mechanics with limited same-specification cosmetic replacement.',
    skillLevel: 'Beginner / casual',
    philosophy: 'Personalize the car without converting cosmetic changes into hidden performance upgrades.',
    allowed: [
      'Everything permitted in Box Stock.',
      'A different color of the same chassis mold and material.',
      'A different color of the same wheel mold, diameter, width and material.',
      'A different color or print of the same body/cowl type.',
      'Same-specification replacement parts for repair, subject to inspection.',
    ],
    conditional: [
      'A cosmetic replacement must be functionally identical to the original part; color alone may change.',
      'When two versions look similar but use different materials, offsets, tire compounds or geometry, the replacement requires pre-approval.',
    ],
    prohibited: [
      'Changing wheel design, diameter, width or offset.',
      'Changing tire compound, size or profile.',
      'Changing chassis type, A-parts geometry, motor, gears, rollers or bearings.',
      'Any performance upgrade, cutting, drilling, sanding, countersinking, wheel piercing or tire processing.',
      'Using limited-edition parts that are mechanically different from the kit component.',
    ],
    inspection: [
      'Replacement parts match original mold and specification',
      'Stock motor, gears, rollers and bearings',
      'No tire or wheel performance change',
      'No machining or added tuning parts',
      'General safety and measurements',
    ],
  },
  {
    slug: 'b-max',
    name: 'B-Max',
    shortName: 'B-Max',
    icon: '⚡',
    color: '#F97316',
    summary: 'A no-cut tuning class using genuine parts and bolt-on systems.',
    skillLevel: 'Intermediate',
    philosophy: 'Maximize setup quality while preserving the original form of the chassis and tuning parts.',
    allowed: [
      'Genuine Tamiya chassis used in its intended direction without cutting or hollowing.',
      'Genuine Tamiya plastic, FRP, carbon and aluminum plates installed through existing holes.',
      'Countersinking existing chassis and plate holes without creating new attachment holes.',
      'Wheel-shaft piercing through the existing wheel bore.',
      'Genuine Tamiya rollers, bearings, shafts, brakes, mass dampers, stabilizers and sliding-damper sets.',
      'Trimming brake sponge, Mini 4WD tape and rubber tube to the required installation size.',
      'Plastic or polycarbonate bodies trimmed only for fitment and interference clearance.',
      'All motors marked legal for B-Max in the club motor matrix.',
    ],
    conditional: [
      'Sliding dampers must use their intended genuine components and remain securely mounted.',
      'Body cutting must preserve a recognizable body and may not create a suspended-body or moving-body damping system.',
      'Plates may be stacked or bonded but may not be reshaped, tapered, drilled or cut.',
      'Parts that can touch the course wall must be fixed, except normal wheels, rollers, mass dampers and sliding-damper motion.',
    ],
    prohibited: [
      'Cutting, hollowing, reversing, heating or reshaping the chassis.',
      'Cutting, drilling, sanding, tapering or reshaping FRP, carbon, aluminum or roller parts.',
      'Tire sanding, shaving, truing, stretching or chemical treatment.',
      'Changing roller diameter, machining rollers, replacing roller bearings or altering plastic rings.',
      'Floating gears, modified gears, custom gear clamps or altered gear ratios.',
      'Chouchin, hikuo, norio, catcher-damper, anchor, AT/pivot or other custom moving systems not supplied as a legal bolt-on set.',
      'Homemade, copied, third-party or 3D-printed components installed on the race car.',
    ],
    inspection: [
      'No chassis or plate cutting and no added holes',
      'Genuine unmodified rollers, gears and tuning components',
      'Legal motor and chassis-compatible gear ratio',
      'Tires and wheels not processed beyond allowed wheel piercing',
      'No prohibited moving gimmick or homemade component',
      'Secure screws, covered shafts, body attachment and full measurements',
    ],
  },
  {
    slug: 'open-class',
    name: 'Open Class',
    shortName: 'Open',
    icon: '🔥',
    color: '#DC2626',
    summary: 'Maximum Tamiya-legal modification within the general regulations.',
    skillLevel: 'Advanced',
    philosophy: 'Creative engineering is encouraged, but official dimensions, recognizable parts, safety and legal motors still apply.',
    allowed: [
      'Chassis cutting and material removal while the original chassis remains identifiable and structurally safe.',
      'Cutting, drilling and reshaping eligible plastic parts within the official identifiable-part rules.',
      'Modified tires and wheels that remain secure, within legal measurements and without altered surface material properties.',
      'Legal Tamiya plates, dampers, brakes and adaptive systems assembled from genuine parts.',
      'Legal gear lightening and bearing installation while preserving a supported gear ratio.',
      'Body modification while retaining a recognizable, painted or stickered and securely mounted body.',
      'All motors marked legal for Open Class in the club motor matrix.',
    ],
    conditional: [
      'Carbon, FRP, metal, shafts and rollers must retain a configuration allowed by the current official regulations; officials may reject unsafe or unidentifiable modifications.',
      'Custom adaptive systems are allowed only when built from genuine eligible Tamiya parts and when no component can damage the track or another car.',
      'Tire shaping is allowed, but chemical treatment or changes to the tire surface material are prohibited.',
    ],
    prohibited: [
      'Homemade chassis or bodies and non-Tamiya race-car components.',
      '3D-printed parts installed on the car, including brackets, rollers, dampers or structural adapters.',
      'Opened, rewound, cap-removed or otherwise altered motors.',
      'Unsupported gear ratios, two-wheel-drive conversions, dangerous projections or exposed sharp shafts.',
      'Parts designed to obstruct competitors or components likely to shed grease, oil or debris.',
      'Ultra-Dash and Plasma-Dash under the current Greenland club motor list.',
    ],
    inspection: [
      'Overall dimensions, minimum weight and clearance',
      'Recognizable body, chassis and modified-part identity',
      'Legal motor and supported gear ratio',
      'Secure tires, wheels, rollers, dampers and adaptive systems',
      'No non-Tamiya or printed on-car component',
      'No sharp, leaking, loose or track-damaging element',
    ],
  },
];

export const CLASS_MATRIX = [
  ['Kit-only parts', 'Required', 'Required mechanically', 'No', 'No'],
  ['Same-spec cosmetic swaps', 'Limited repair', 'Allowed', 'Allowed', 'Allowed'],
  ['Grade-Up parts', 'No', 'No', 'Yes', 'Yes'],
  ['Carbon / FRP plates', 'No', 'No', 'Yes, uncut', 'Yes, official limits'],
  ['Chassis cutting', 'No', 'No', 'No', 'Yes'],
  ['New holes in plates/chassis', 'No', 'No', 'No', 'Open rules only'],
  ['Wheel piercing', 'No', 'No', 'Yes', 'Yes'],
  ['Tire sanding / shaving', 'No', 'No', 'No', 'Yes, no surface treatment'],
  ['Sliding damper', 'No', 'No', 'Legal bolt-on set', 'Yes'],
  ['Custom moving gimmicks', 'No', 'No', 'No', 'Yes, Tamiya parts only'],
  ['3D-printed on-car parts', 'No', 'No', 'No', 'No'],
];

export const INSPECTION_CHECKLIST = [
  'Confirm the car is entered in the correct class.',
  'Measure length, width, height, ground clearance, weight and tire dimensions.',
  'Verify body attachment, four-wheel drive and all exposed shafts/screws are safe.',
  'Confirm motor legality, motor condition and chassis-compatible gear ratio.',
  'Check class-specific chassis, plate, tire, wheel, roller and damper modifications.',
  'Reject loose parts, leaks, altered batteries or components likely to damage the course.',
  'Apply an inspection mark; no setup changes are permitted afterward without official approval.',
  'Reinspect after major repair, suspected damage or at an official’s discretion.',
];

export const PENALTY_STEPS = [
  {
    level: 'Inspection correction',
    text: 'An illegal or unsafe setup found before racing must be corrected and reinspected.',
  },
  {
    level: 'Warning / restart',
    text: 'A first procedural error may receive one warning and restart when the race director determines no advantage was gained.',
  },
  {
    level: 'Run disqualification',
    text: 'Course interference, an illegal component, an uncorrected false start or a failed post-run inspection can invalidate that run.',
  },
  {
    level: 'Event disqualification',
    text: 'Repeated violations, altering a car after inspection, deliberate obstruction or serious unsporting behavior can remove the racer from the event.',
  },
  {
    level: 'Suspension',
    text: 'Motor tampering, intentional cheating, dangerous conduct or repeated event-level violations may result in temporary or permanent club suspension.',
  },
];

export const GUIDE_TOPICS: GuideTopic[] = [
  {
    slug: 'start-here',
    title: 'Start Here',
    icon: '🚦',
    color: '#22C55E',
    summary: 'From opening your first kit to passing inspection and completing race day.',
    audience: 'First-time builders and racers',
    sections: [
      {
        title: 'Your first build',
        bullets: [
          'Choose a modern kit with an intact chassis, body, wheels, tires, gears and normal motor.',
          'Use side cutters, a small Phillips screwdriver, tweezers and a parts tray.',
          'Follow the kit manual in order; do not force gears, terminals or wheel shafts.',
          'Apply only a small amount of grease at the locations shown in the instructions.',
          'Spin the drivetrain by hand before installing batteries. It should feel smooth and consistent.',
        ],
      },
      {
        title: 'Choose a class before buying upgrades',
        bullets: [
          'Box Stock: race the exact kit and learn clean assembly.',
          'Open Box Stock: personalize colors without changing mechanical performance.',
          'B-Max: add bolt-on plates, rollers, dampers, brakes and legal motors without cutting parts.',
          'Open Class: advanced modification within the Tamiya and Greenland general regulations.',
        ],
        callout: 'Do not upgrade first and choose a class later. One prohibited modification can move the entire car into Open Class.',
      },
      {
        title: 'First-race checklist',
        bullets: [
          'Bring the car, spare AA batteries, screwdriver, tape, spare screws and your race ticket.',
          'Check wheel security, roller movement, terminal contact, body catch and ground clearance.',
          'Clean excess grease and make sure no shaft or screw can scratch a person or the track.',
          'Ask for a voluntary inspection before official registration when you are unsure.',
        ],
      },
    ],
  },
  {
    slug: 'motors',
    title: 'Motor Guide',
    icon: '⚙️',
    color: '#F97316',
    summary: 'Understand torque, speed, chassis compatibility and club legality.',
    audience: 'All racers',
    sections: [
      {
        title: 'Read a motor by track requirement',
        bullets: [
          'Torque helps acceleration, climbs, repeated corners and recovery after lane changes.',
          'Higher rotational speed helps long straights but increases heat and course-out risk.',
          'A faster motor is not automatically faster on a technical track.',
          'Dual-shaft PRO motors are for ME, MA and MS-family chassis; single-shaft motors are for compatible single-shaft chassis.',
        ],
      },
      {
        title: 'Practical motor progression',
        table: {
          headers: ['Motor group', 'Character', 'Typical use'],
          rows: [
            ['Normal', 'Lowest stress and easiest control', 'Box Stock, learning and shakedown'],
            ['Torque-Tuned', 'Strong acceleration', 'Technical tracks, slopes and heavier B-Max cars'],
            ['Atomic-Tuned', 'Balanced', 'Mixed layouts and safe first upgrade'],
            ['Rev-Tuned', 'Higher-speed bias', 'Longer straights and light cars'],
            ['Light-Dash', 'Moderate dash step', 'Faster B-Max with manageable heat'],
            ['Hyper-Dash', 'High all-round output', 'Experienced B-Max and Open setups'],
            ['Power / Sprint / Mach-Dash PRO', 'High-output specialized motors', 'Advanced setups with strong brakes and stability'],
          ],
        },
      },
      {
        title: 'Motor preparation and safety',
        bullets: [
          'Use only unopened genuine motors. Do not remove the cap, change coils or alter brushes.',
          'Run a short shakedown, let the motor cool and check for abnormal noise or smell.',
          'Keep oil away from the commutator and track. Any leaking car can be rejected.',
          'Match batteries as a pair and stop using cells with damaged wraps or labels.',
        ],
        callout: 'The motor legality matrix on the Rules page controls race entry. This guide describes behavior, not permission.',
      },
    ],
  },
  {
    slug: 'gearing',
    title: 'Gearing Guide',
    icon: '🦷',
    color: '#FACC15',
    summary: 'Balance acceleration, motor load and top speed with a legal ratio.',
    audience: 'Beginner to advanced',
    sections: [
      {
        title: 'What the ratio means',
        bullets: [
          'A lower number such as 3.5:1 turns the wheels farther per motor revolution and favors top speed.',
          'A higher number such as 5:1 multiplies torque and favors acceleration and climbing.',
          'The fastest useful ratio depends on motor, tire diameter, car weight and track layout.',
          'Only use gear combinations supported for your chassis.',
        ],
      },
      {
        title: 'Quick ratio reference',
        table: {
          headers: ['Ratio', 'Bias', 'Use it when'],
          rows: [
            ['3.5:1', 'High speed', 'Long straights, controlled motor and stable lightweight car'],
            ['3.7:1', 'Speed-balanced', 'Fast mixed tracks'],
            ['4.0:1', 'Balanced', 'General-purpose setup and first testing'],
            ['4.2:1', 'Torque-balanced', 'Technical layouts, slopes or heavier cars'],
            ['5.0:1', 'High torque', 'Learning, steep layouts or weak motor/battery conditions'],
          ],
        },
      },
      {
        title: 'A reliable testing method',
        bullets: [
          'Start with a moderate motor and 4.0:1 or 4.2:1 gearing.',
          'Record lap behavior: acceleration, lane-change stability, motor temperature and battery drop.',
          'Change one variable at a time. A motor and gear change together hides the cause of improvement.',
          'Gear noise usually indicates poor mesh, bent shafts, debris or incorrect assembly—not a need for more grease.',
        ],
      },
    ],
  },
  {
    slug: 'chassis',
    title: 'Chassis Guide',
    icon: '🏎️',
    color: '#3B82F6',
    summary: 'Compare common chassis layouts and choose a practical starting platform.',
    audience: 'Kit buyers and builders',
    sections: [
      {
        title: 'Common chassis profiles',
        table: {
          headers: ['Chassis', 'Layout', 'Practical profile'],
          rows: [
            ['AR', 'Rear motor, single shaft', 'Rigid all-round platform with broad upgrade support'],
            ['FM-A', 'Front motor, single shaft', 'Stable front-motor layout suited to brake and roller tuning'],
            ['MA', 'Mid motor, dual shaft', 'Integrated, accessible and beginner-friendly PRO chassis'],
            ['MS', 'Mid motor, dual shaft', 'Modular PRO platform with strong advanced-development potential'],
            ['Super-II', 'Rear motor, single shaft', 'Light and simple classic platform'],
            ['VZ', 'Rear motor, single shaft', 'Modern lightweight platform with flexible setup options'],
            ['VS', 'Rear motor, single shaft', 'Light classic chassis that rewards careful assembly'],
          ],
        },
      },
      {
        title: 'How to choose',
        bullets: [
          'For a first kit, prioritize parts availability and ease of straight assembly over theoretical maximum speed.',
          'MA is a practical first PRO chassis; AR, FM-A and VZ are practical single-shaft choices.',
          'Choose MS when you specifically want a modular platform and understand its class restrictions.',
          'The body and kit package can matter more than the bare chassis when racing Box Stock.',
        ],
      },
      {
        title: 'Compatibility fundamentals',
        bullets: [
          'Single-shaft and dual-shaft motors are not interchangeable.',
          'Gear sets, terminals, A-parts, rear stays and body mounts can be chassis-specific.',
          'A part marketed as universal may still require a legal mounting hole or adapter.',
          'For B-Max, any required cutting, drilling or reshaping makes the installation illegal.',
        ],
      },
    ],
  },
  {
    slug: 'tires-wheels',
    title: 'Tires & Wheels',
    icon: '🛞',
    color: '#A855F7',
    summary: 'Control grip, bounce, diameter and stability without violating class rules.',
    audience: 'All racers',
    sections: [
      {
        title: 'Key variables',
        bullets: [
          'Diameter changes effective gearing and ground clearance.',
          'Width and offset influence stability and available space around brakes and plates.',
          'Soft compounds usually add grip; harder and low-friction compounds usually reduce scrub.',
          'Four wheels must be secure, true enough to run safely and remain within the 22–35 mm diameter and 8–26 mm width limits.',
        ],
      },
      {
        title: 'Track behavior',
        table: {
          headers: ['Condition', 'Typical direction'],
          rows: [
            ['Technical corner-heavy track', 'Controlled grip, moderate diameter, stable wheel fit'],
            ['Long straight track', 'Low rolling loss and careful overall gearing'],
            ['Jump-heavy track', 'Reduce bounce and verify landing stability'],
            ['Slopes and banks', 'Protect ground clearance and avoid excessive tire deformation'],
          ],
        },
      },
      {
        title: 'Class legality',
        bullets: [
          'Box Stock and Open Box Stock use the kit tire and wheel specification.',
          'B-Max permits legal replacement wheels/tires but prohibits sanding, shaving, stretching, truing and chemical treatment.',
          'B-Max wheel piercing through the existing bore is allowed.',
          'Open Class permits shaping within official limits, but the surface material properties may not be chemically changed.',
        ],
      },
    ],
  },
  {
    slug: 'rollers-stabilizers',
    title: 'Rollers & Stabilizers',
    icon: '🧭',
    color: '#14B8A6',
    summary: 'Choose roller size, material and placement for predictable wall contact.',
    audience: 'B-Max and Open racers',
    sections: [
      {
        title: 'Roller fundamentals',
        bullets: [
          'Rollers guide the car along course walls; alignment and smooth rotation matter as much as material.',
          'Larger rollers can reduce the angular reaction at wall contact, while placement changes leverage and stability.',
          'Plastic rollers are light and simple. Aluminum ball-bearing rollers are precise but add cost and weight.',
          'Plastic-ring and rubber-ring rollers change wall-contact behavior; use them only in their original legal configuration.',
        ],
      },
      {
        title: 'Placement checklist',
        bullets: [
          'Keep left and right roller heights symmetrical unless a deliberate legal setup requires otherwise.',
          'Verify the car stays under 105 mm wide at its widest roller point.',
          'Use stabilizers to reduce body or plate contact with the wall and to control rollover.',
          'Cover exposed screw and shaft ends and tighten locknuts without binding the roller.',
        ],
      },
      {
        title: 'Modification limits',
        bullets: [
          'B-Max rollers may not be machined, resized, have bearings replaced or have rings added/removed.',
          'Open Class still follows official identifiable-part and prohibited-combination rules.',
          'Third-party or 3D-printed rollers are not legal in Greenland club races.',
        ],
      },
    ],
  },
  {
    slug: 'brakes-dampers',
    title: 'Brakes & Dampers',
    icon: '🛑',
    color: '#EF4444',
    summary: 'Manage jumps, slopes, rebound and landing without simply reducing speed everywhere.',
    audience: 'B-Max and Open racers',
    sections: [
      {
        title: 'How brakes work',
        bullets: [
          'Brake sponge contacts raised track sections and converts speed into friction before a jump or lane change.',
          'Lower brakes engage sooner but risk scraping. Higher brakes preserve speed but may not engage enough.',
          'Front and rear brake balance changes pitch during takeoff.',
          'Use the minimum braking needed to complete the course consistently.',
        ],
      },
      {
        title: 'Mass dampers',
        bullets: [
          'Mass dampers absorb part of the landing motion and can reduce repeated bouncing.',
          'Position affects pitch, roll and total weight distribution.',
          'More mass is not always better; excessive weight can overload the motor and slow acceleration.',
          'All moving weights must remain securely captured throughout the run.',
        ],
      },
      {
        title: 'Class boundary',
        bullets: [
          'B-Max allows genuine bolt-on brakes, mass dampers and sliding-damper sets without reshaping their structural parts.',
          'B-Max prohibits suspended-body and custom moving systems such as chouchin, catcher-damper, anchor and pivot arrangements.',
          'Open Class permits broader adaptive systems built from genuine legal parts, subject to safety and inspection.',
        ],
      },
    ],
  },
  {
    slug: 'batteries-maintenance',
    title: 'Batteries & Maintenance',
    icon: '🔋',
    color: '#84CC16',
    summary: 'Prepare reliable power, reduce drivetrain loss and keep the car race-safe.',
    audience: 'All racers',
    sections: [
      {
        title: 'Battery rules and handling',
        bullets: [
          'Use matched AA alkaline or NiMH cells with intact original labels and wrapping.',
          'Do not mix battery types, capacities, ages or charge states in one car.',
          'Charge NiMH cells with a charger designed for NiMH chemistry and follow the cell manufacturer’s limits.',
          'Lithium cells and rewrapped or damaged batteries are prohibited.',
        ],
      },
      {
        title: 'Routine maintenance',
        bullets: [
          'Remove hair, dust and rubber debris from axles, gears and rollers.',
          'Clean battery terminals gently and replace distorted terminals rather than over-bending them.',
          'Inspect pinion, crown and counter gears for cracks and uneven wear.',
          'Use very small amounts of appropriate lubricant at manual-specified points only.',
          'Check screw tightness, locknuts, wheel security and body catches before every race.',
        ],
      },
      {
        title: 'Diagnosing a slow car',
        bullets: [
          'Test with a known matched battery pair.',
          'Spin each wheel and roller separately to find binding.',
          'Check shaft straightness, wheel rub, gear mesh and terminal contact.',
          'Compare motor temperature after a short run. Excess heat often indicates load or friction.',
        ],
      },
    ],
  },
  {
    slug: 'parts-compatibility',
    title: 'Parts Compatibility',
    icon: '🧩',
    color: '#EC4899',
    summary: 'Verify chassis, mounting and class compatibility before buying or installing a part.',
    audience: 'Shoppers and builders',
    sections: [
      {
        title: 'Three compatibility checks',
        bullets: [
          'Mechanical: does the part physically fit the chassis and body?',
          'Regulatory: can it be installed without a modification prohibited in the chosen class?',
          'System: does it conflict with motor type, gears, wheels, brakes, body mounts or another upgrade?',
        ],
      },
      {
        title: 'Before purchasing',
        bullets: [
          'Confirm the Tamiya item number and supported chassis list.',
          'Check whether adapters, extra plates, spacers or a different screw length are required.',
          'For B-Max, reject installations requiring new holes, plate cutting, chassis cutting or reshaping.',
          'For Box Stock classes, compatible does not mean legal—the kit specification still controls.',
          'Use the Shop filters and ask for confirmation when the product description is not chassis-specific.',
        ],
      },
      {
        title: 'Workshop and 3D-printed items',
        bullets: [
          'Motor stands, sorting trays, car stands, tool organizers and setup holders are workshop aids and may be used off the track.',
          'A 3D-printed item may not be installed on a race car in any Greenland club class.',
          'Measurement tools do not become legal car parts merely because they are made by Tamiya.',
        ],
        callout: 'When uncertain, send the chassis name, product item number and intended class before purchasing.',
      },
    ],
  },
];

export function getRuleClass(slug: string) {
  return RULE_CLASSES.find((entry) => entry.slug === slug);
}

export function getGuideTopic(slug: string) {
  return GUIDE_TOPICS.find((entry) => entry.slug === slug);
}
