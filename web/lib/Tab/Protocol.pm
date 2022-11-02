package Tab::Protocol;
use base 'Tab::DBI';
Tab::Protocol->table('protocol');
Tab::Protocol->columns(All => qw/id name tourn timestamp/);

Tab::Protocol->has_a(tourn => 'Tab::Tourn');

Tab::Protocol->has_many(tiebreaks => 'Tab::Tiebreak'        , 'protocol');
Tab::Protocol->has_many(rounds    => 'Tab::Round'           , 'protocol');
Tab::Protocol->has_many(settings  => 'Tab::ProtocolSetting' , 'protocol');

__PACKAGE__->_register_datetimes( qw/timestamp/);

sub setting {

	my ($self, $tag, $value, $blob) = @_;

	$/ = "";			#Remove all trailing newlines
	chomp $blob;

	my $existing = Tab::ProtocolSetting->search(
		protocol => $self->id,
		tag          => $tag,
	)->first;

	if (defined $value) {

		if ($existing) {

			$existing->value($value);
			$existing->value_text($blob) if $value eq "text";
			$existing->value_date($blob) if $value eq "date";
			$existing->update;

			if ($value eq "delete" || $value eq "" || $value eq "0") {
				$existing->delete;
			}

			return;

		} elsif ($value ne "delete" && $value && $value ne "0") {

			my $existing = Tab::ProtocolSetting->create({
				protocol => $self->id,
				tag          => $tag,
				value        => $value,
			});

			if ($value eq "text") {
				$existing->value_text($blob);
			}

			if ($value eq "date") {
				$existing->value_date($blob);
			}

			$existing->update;

		}

	} else {

		return unless $existing;
		return $existing->value_text if $existing->value eq "text";
		return $existing->value_date if $existing->value eq "date";
		return $existing->value;

	}

}


sub all_settings {

	my $self = shift;

	my %all_settings;

	my $dbh = Tab::DBI->db_Main();

    my $sth = $dbh->prepare("
		select setting.tag, setting.value, setting.value_date, setting.value_text
		from protocol_setting setting
		where setting.protocol = ?
        order by setting.tag
    ");

    $sth->execute($self->id);

    while( my ($tag, $value, $value_date, $value_text)  = $sth->fetchrow_array() ) {

		if ($value eq "date") {

			my $dt = Tab::DBI::dateparse($value_date);
			$all_settings{$tag} = $dt if $dt;

		} elsif ($value eq "text") {

			$all_settings{$tag} = $value_text;

		} else {

			$all_settings{$tag} = $value;

		}

	}

	return %all_settings;

}

