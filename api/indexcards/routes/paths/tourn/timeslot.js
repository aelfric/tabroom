// These paths are particular to tournament administration, and so require a
// logged in user with access to the tournament in question.

// Router controllers
import { messageTimeslot, messageFree } from '../../../controllers/tourn/section/blast/message.js';
import { blastTimeslot } from '../../../controllers/tourn/section/blast/pairing.js';

export default [
	{ path : '/tourn/{tourn_id}/timeslot/{timeslot_id}/message' , module : messageTimeslot } ,
	{ path : '/tourn/{tourn_id}/timeslot/{timeslot_id}/free/message' , module : messageFree } ,
	{ path : '/tourn/{tourn_id}/timeslot/{timeslot_id}/blast'   , module : blastTimeslot }   ,
];
