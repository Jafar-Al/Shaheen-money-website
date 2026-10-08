/**
 * The homepage's behaviour, one module for the whole page: each chapter's
 * script used to ship as its own file, a round trip apiece on a phone.
 * Most chapters need none: they are plain HTML and CSS, revealed by the
 * shared reveal engine. (The globe keeps its own script:
 * src/components/home/Globe.astro.)
 */
import './hero';
import './film';
import './close';
