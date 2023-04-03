// Parse the Tabroom cookies and determine whether there's an active session

const tournAuth = async function(req) {

	const tournId = parseInt(req.params.tourn_id);
	const session = req.session;

	if (session == null || Object.entries(session).length === 0) {
		return session;
	}

	if (typeof (tournId) === 'undefined') {
		return session;
	}

	// You have already demanded this of me, foul knave!  Begone!
	if (req.session[tournId]) {
		return session;
	}

	session[tournId] = {};

	// You are verily a Deity, a god amongst us humble mortals.  Pass, and be
	// welcomed, unless we have to specially check what your perms are for
	// display or contact purposes (this skip_admin flag)

	if (req.session.site_admin) {
		session[tournId].level = 'owner';
		session[tournId].menu  = 'all';
		return session;
	}

	// Dost thou hath the keys to this gate?

	const result = await req.db.permission.findAll({
		where: { tourn: tournId, person: req.session.person },
	});

	if (result.count < 1) {

		delete session[tournId];

	} else {

		result.forEach(perm => {

			let current = '';

			if (session[tournId]) {
				current = session[tournId].level;
			}

			if (perm.tag === 'contact') {

				session[tournId].contact = true;

			} else if (
				perm.tag === 'owner'
				|| current === 'owner'
			) {

				// Nothing should override if I'm the owner already, so let's
				// just skip the rest and clear the flags

				session[tournId].level = 'owner';
				session[tournId].menu = 'all';
				delete session[tournId].events;

			} else if (
				perm.tag === 'tabber'
				|| current === 'tabber'
			) {

				session[tournId].level = 'tabber';
				session[tournId].menu  = 'all';
				delete session[tournId].events;

			} else if (
				perm.tag === 'by_event'
				|| current === 'by_event'
			) {

				session[tournId].level  = 'by_event';
				session[tournId].menu   = 'events';
				session.events = perm.details;

			} else if (
				perm.tag === 'checker'
			) {

				session[tournId].level  = 'checker';
				session[tournId].menu   = 'none';
				session.events = perm.details;
			}
		});
	}

	return session;
};

export const checkPerms = async (req, res, query, replacements) => {

	const [permsData] = await req.db.sequelize.query(query, {
		replacements,
		type: req.db.sequelize.QueryTypes.SELECT,
	});

	if (permsData.tourn !== parseInt(req.params.tourn_id)) {
		res.status(200).json({
			error     : false,
			message   : `You have a mismatch between the tournament element tourn ${permsData.tourn} and its parent tournament ${req.params.tourn_id}`,
		});
	}

	if (req.session[permsData.tourn]) {

		if (req.session[permsData.tourn].level === 'owner') {
			return true;
		}

		if (
			req.session[permsData.tourn].level === 'tabber'
			&& req.threshold !== 'owner'
		) {
			return true;
		}

		if (
			req.session[permsData.tourn].level === 'checker'
			&& req.threshold !== 'tabber'
			&& req.threshold !== 'owner'
		) {
			return true;
		}

		if (req.session[permsData.tourn].level === 'by_event') {

			if (
				req.threshold === 'tabber'
				&& req.session.events[permsData.event] === 'tabber'
			) {
				return true;
			}

			if (
				req.session.events
				&& req.threshold !== 'owner'
				&& req.threshold !== 'tabber'
				&& (
					req.session.events[permsData.event] === 'checker'
					|| req.session.events[permsData.event] === 'tabber'
				)
			) {
				return true;
			}
		}
	}

	res.status(200).json({
		error     : false,
		message   : `You do not have permission to access that part of that tournament`,
	});
};

export const sectionCheck = async (req, res, sectionId) => {

	const sectionQuery = `
		select event.tourn, event.id event
			from panel, round, event
		where panel.id = :sectionId
			and panel.round = round.id
			and round.event = event.id
	`;

	const replacements = { sectionId };
	return checkPerms(req, res, sectionQuery, replacements);
};

export const roundCheck = async (req, res, roundId) => {

	const roundQuery = `
		select event.tourn, event.id event
			from round, event
		where round.id = :roundId
			and round.event = event.id
	`;

	const replacements = { roundId };
	return checkPerms(req, res, roundQuery, replacements);
};

export const eventCheck = async (req, res, eventId) => {
	const eventQuery = `
		select event.tourn, event.id event
			from event
		where event.id = :eventId
	`;

	const replacements = { eventId };
	return checkPerms(req, res, eventQuery, replacements);
};

export const entryCheck = async (req, res, entryId) => {
	const entryQuery = `
		select event.tourn, entry.event
		from entry, event
		where entry.id = :entryId
			and entry.event = event.id
	`;

	const replacements = { entryId };
	return checkPerms(req, res, entryQuery, replacements);
};

export const schoolCheck = async (req, res, schoolId) => {
	const schoolQuery = `
		select school.tourn, school.id school
			from school
		where school.id = :schoolId
	`;

	const replacements = { schoolId };
	return checkPerms(req, res, schoolQuery, replacements);
};

export const timeslotCheck = async (req, res, timeslotId) => {
	const timeslotQuery = `
		select timeslot.tourn, timeslot.id timeslot
			from timeslot
		where timeslot.id = :timeslotId
	`;

	const replacements = { timeslotId };
	return checkPerms(req, res, timeslotQuery, replacements);
};

export const judgeCheck = async (req, res, judgeId) => {
	const judgeQuery = `
		select category.tourn, event.id event
			from category, event, judge
		where judge.id = :judgeId
			and judge.category = category.id
			and category.id = event.category
			and event.id IN :eventIds
	`;

	const replacements = { judgeId, eventIds: [Object.keys(req.session.events)] };
	return checkPerms(req, res, judgeQuery, replacements);
};

export const categoryCheck = async (req, res, categoryId) => {
	const categoryQuery = `
		select category.tourn, event.id event
			from category, event
		where category.id = :categoryId
			and category.id = event.category
			and event.id IN :eventIds
	`;

	const replacements = { categoryId, eventIds: [Object.keys(req.session.events)] };
	return checkPerms(req, res, categoryQuery, replacements);
};

export default tournAuth;
