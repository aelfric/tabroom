import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import moment from 'moment-timezone';

import JSONTable from '../common/table/JSONTable';

const TournList = () => {

	const { name } = useParams();
	const navigate = useNavigate();

	const handleNavigate = () => {
		navigate('/route');
	};

	const [tourns, setTourns] = useState([]);

	useEffect(() => {
		const fetchList = async () => {
			const response = await fetch(`${process.env.REACT_APP_API_BASE}/invite/upcoming`, { method: 'GET' });
			setTourns(await response.json());
		};
		fetchList();
	}, []);

	const tournTable = tourns.map( (tourn) => {

		const tournRow = {};

		['districts', 'nats', 'msnats', 'name'].forEach( (key) => {
			if (tourn[key]) {
				tournRow.style = 'semibold';
			}
		});

		const now = moment();

		if (moment(tourn.start).tz(tourn.tz).date() === moment(tourn.end).tz(tourn.tz).date()) {
			tournRow.dates = moment(tourn.start).tz(tourn.tz).format('M/D');
		} else {
			tournRow.dates = `${moment(tourn.start).tz(tourn.tz).format('M/D')} - ${moment(tourn.end).tz(tourn.tz).format('M/D')}`;
		}

		if (tourn.webname) {
			tournRow.link = `https://${tourn.webname}.tabroom.com`;
		} else if (!tourn.link) {
			tournRow.link = `https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=${tourn.id}`;
		}

		tournRow.tournament = tourn.name;
		tournRow.city = tourn.location;

		if (tourn.country && tourn.country !== 'US') {
			tournRow.state = tourn.country;
		} else {
			tournRow.state = tourn.state;
		}

		tournRow.type = '';
		['inp', 'hybrid', 'online'].forEach( (key) => {
			if (tourn[key] > 0) {
				tournRow.type += `${key.substring(0, 3)} `;
			}
		});

		if (now < moment(tourn.reg_start)) {
			tournRow.registration = `Opens on ${moment(tourn.reg_start).tz(tourn.tz).format('M/D hh:mm A z')}`;
		} else if (now < moment(tourn.reg_end)) {
			tournRow.registration = `Due by ${moment(tourn.reg_end).tz(tourn.tz).format('M/D hh:mm A z')}`;
		} else {
			tournRow.registration = 'Closed';
		}

		tournRow.signup = tourn.signup;
		return tournRow;

	});

	const transforms = [
		{ accessor : 'link'  , hidden : true , excludeCSV: true },
		{ accessor : 'style' , hidden : true , excludeCSV: true },
		{
			accessor : 'tournament',
			cell: (row) => {
				return <a href='{row.original.link}'>{row.getValue()}</a>;
			},
		},
		{
			accessor : 'type',
			cell: (row) => {
				return <a href='{row.original.link}'>{row.getValue()}</a>;
			},
		},
		{
			accessor : 'dates',
			sortingFn: (rowA, rowB) => {
				if (rowA.original.week === rowB.original.week) { return 0; }
				if (rowA.original.week > rowB.original.week) { return 1; }
				if (rowA.original.week < rowB.original.week) { return -1; }
				return 0;
			},
		},
	];

	const customStyles = {
		table: 'tight',
	};

	return (
		<div>
			<h1>Upcoming Tournaments</h1>
			<JSONTable
				data    = {tournTable}
				options = {{ transforms, customStyles, striped: true, exportFileName: 'UpcomingTournament'  }}
			/>
			<button onClick={handleNavigate} type="button">Go to /route</button>
			<p>{name}</p>
		</div>
	);
};

export default TournList;
