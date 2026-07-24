export interface SampleManuscript {
  id: string;
  title: string;
  genre: string;
  author: string;
  excerpt: string;
}

export const SAMPLE_MANUSCRIPTS: SampleManuscript[] = [
  {
    id: 'scifi-exodus',
    title: 'Echoes of the Void',
    genre: 'Science Fiction',
    author: 'A. K. Vance',
    excerpt: `The hum of the ion drive on the starship Aegis-9 was a low, comforting purr, but Commander Jaxom Thul could feel the micro-vibrations through his titanium-plated cybernetic leg. He stood at the viewport, staring out into the glittering dust of the Obsidian Nebula. His mechanical eye, glowing with a soft sapphire aperture, zoomed in on the fractured crust of Sector 4.

"We are approaching the gravitational threshold, Commander," said Echo, the ship's resident AI Overseer. Echo's voice was clean, melodic, yet entirely devoid of biological breath. On the terminal screen, her avatar flickered—a serene face constructed from shifting constellations of blue data points. "Scanning indicates no life forms, but thermal residuals suggest a high-density energy beacon was active less than three solar hours ago."

Jaxom scowled, tapping his metallic knuckles against the armrest of his command chair. "We aren't the first ones here, Echo. Did Vesper leave a trail?"

"Dr. Vesper Lin's sub-dermal beacon has been silent since she entered the nebula," Echo replied, a stream of complex telemetry scrolling across the displays. "However, I have detected localized spatial distortions. She would call them 'gravitational footprints.' She always was fond of poetic terminology."

Just then, a klaxon chimed, amber light washing over the cockpit. The hatch slid open with a pressurized hiss, and Zephyr, a high-strung reconnaissance drone with advanced levitation subroutines, floated in. His chrome chassis was scuffed, and his optical sensors spun in agitation. "Vibration! Kinetic shock waves incoming!" Zephyr buzzed in his high-pitched, synthetic voice. "I ventured near the beacon's coordinate. Something exists there. A shifting, non-biological mass. It doesn't obey standard quantum mechanics!"

"Calm your gyros, Zephyr," Jaxom ordered, his deep, gravelly voice restoring order. "Did you secure the telemetry?"

"Secured and insulated!" Zephyr chirped, displaying a holographic coordinate grid. "But Dr. Lin's research pad was floating in the decompression chamber. The glass was cracked. She is gone, Commander. Or worse... integrated."`
  },
  {
    id: 'fantasy-relic',
    title: 'The Whispering Spire',
    genre: 'High Fantasy',
    author: 'Elowen Greenleaf',
    excerpt: `The rain over the city of Oakhaven was thick and gray, drumming endlessly against the heavy oak doors of the Gilded Tankard. Inside, Elian Stormweaver sat by the hearth, a cup of spiced mead cooling in his hand. His silver hair fell across a brow lined with worry, and his deep emerald robes bore the star-burst sigils of the High Mages of Solara. 

"You're brooding again, Mage," grunted Thorgar Stonebreaker, pulling up a heavy wooden bench that groaned under his immense weight. The dwarf's beard was braided with copper rings, and his soot-stained leather apron smelled of coal dust and dragon-forge iron. He unslung a massive, runic warhammer from his back, leaning it against the table with a thud that rattled Elian's mead. "We've got the map. The Spire is only a three-day march through the Whispering Woods."

"It's not the distance that troubles me, Thorgar," Elian murmured, his voice soft but carrying an eerie resonance, a side-effect of decades spent tapping into the volatile ether. "It is the sentinel. Archmage Malakor did not build the Whispering Spire to be unlocked by thieves and blacksmiths. He bound a guardian to the hearthstone—a creature of pure living shadow."

From behind the counter, Barnaby, the squint-eyed tavern keeper, watched them with narrow, suspicious eyes. Barnaby wiped a dirty glass with a greasy rag, leaning in closer to overhear their whispers. He had already sent his stable boy, Pip, into the rainy streets an hour ago. Barnaby knew that the King's Inquisitors paid handsomely for any talk of 'solaran relics' or 'forbidden spires.'

"Let the shadow come," Thorgar rumbled, tapping his massive warhammer with a grin. "My iron was quenched in the blood of a mountain drake. It fells shadows just as well as it fells Orcs. What we need is to move before the Red Hand tracks us."

Elian nodded slowly, but his hand tightened around his oak staff, the crystal tip pulsing with a faint, warning gold light. "We leave at midnight. And keep your eyes on Barnaby. He is too quiet tonight, even for a tavern keeper."`
  },
  {
    id: 'noir-shadows',
    title: 'Neon and Rust',
    genre: 'Noir / Detective',
    author: 'Marcus Crane',
    excerpt: `The neon sign outside the office buzzed like an angry hornet, casting alternating bars of hot pink and cold shadow across Silas Vance's mahogany desk. Silas poured two fingers of rye whiskey into a chipped glass, squinting through the haze of cheap cigarette smoke. He was a human who looked like he had been assembled from spare parts—a broken nose from a dockside brawl, eyes as tired as a midnight shift, and a trench coat that had seen more rain than a monsoon.

The door handle turned slowly, and Evelyn Sinclair stepped into the room. She was draped in a silk coat that screamed wealth, but her movements had the tense grace of a hunted leopard. Her dark hair was styled in sleek waves, and her porcelain skin was stark against her ruby-red lipstick.

"Mr. Vance," she said, her voice like velvet draped over dry ice. "My husband's bodyguard said you were the only man in New Carthage who didn't take bribes from the syndicate."

Silas took a slow sip of his rye, his eyes scanning her for details. "Your husband's bodyguard was either naive or misinformed, Mrs. Sinclair. I don't take bribes because I don't like being told what to do. There's a difference. Who sent you?"

"I came alone," she said, though Silas noticed her eyes darting briefly toward the dark hallway behind her. "My husband, Raymond, is... missing. He took a briefcase of cold-storage chips from the central archives. The Syndicate wants them back, and they've hired Viktor to find him."

Silas felt a cold knot tighten in his chest. Viktor—often called 'The Iron Hand'—was a notorious cyborg mercenary who didn't leave survivors. If Viktor was on the scent, Raymond Sinclair was already as good as ashes.

Suddenly, a massive silhouette blocked the frosted glass of the office door. The wood splintered with a deafening crash as Stone, Evelyn's personal cybernetic bodyguard, was thrown through the doorway, his chrome chest-plate dented and sparks spitting from his neck joints. Behind him stood a tall figure in a long leather coat, his arm ending in an integrated heavy-caliber kinetic shocker.

"Vance," Viktor rumbled, his voice modulated through a mechanical vocal grille. "Hand over the lady, and I'll make your death quick."`
  }
];
