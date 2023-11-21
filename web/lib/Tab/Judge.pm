package Tab::Judge;
use base 'Tab::DBI';
Tab::Judge->table('judge');
Tab::Judge->columns(Primary => qw/id/);
Tab::Judge->columns(Essential => qw/school first middle last code active
								ada category person chapter_judge/);

Tab::Judge->columns(Others => qw /alt_category covers obligation hired person_request timestamp /);

# Wow, that's a lot.
Tab::Judge->columns(TEMP => qw/categoryid schoolid tier pref panelid chair
				   tourn avg eventtype eventid
				   diet ballotid personid tab_rating cjid schoolname
				   schoolcode state regname regcode region standby
				   site neutral diversity
/);

Tab::Judge->has_a(category       => 'Tab::Category');
Tab::Judge->has_a(alt_category   => 'Tab::Category');
Tab::Judge->has_a(covers         => 'Tab::Category');
Tab::Judge->has_a(school         => 'Tab::School');
Tab::Judge->has_a(person         => 'Tab::Person');
Tab::Judge->has_a(person_request => 'Tab::Person');
Tab::Judge->has_a(chapter_judge  => 'Tab::ChapterJudge');

Tab::Judge->has_many(ratings  => 'Tab::Rating'       , 'judge');
Tab::Judge->has_many(strikes  => 'Tab::Strike'       , 'judge');
Tab::Judge->has_many(ballots  => 'Tab::Ballot'       , 'judge');
Tab::Judge->has_many(settings => "Tab::JudgeSetting" , "judge");
Tab::Judge->has_many(hires    => "Tab::JudgeHire"    , "judge");

Tab::Judge->has_many(jpools => [Tab::JPoolJudge => 'jpool']);

Tab::Judge->set_sql(highest_code => "select MAX(code) from judge where category = ?");
Tab::Judge->set_sql(lowest_code  => "select MIN(code) from judge where category = ?");

__PACKAGE__->_register_datetimes( qw/timestamp /);

sub setting {

	my ($self, $tag, $value, $blob) = @_;
	$/ = ""; #Remove all trailing newlines

	chomp $blob;

	my @existing = Tab::JudgeSetting->search(
		judge => $self->id,
		tag   => $tag
	);

	my $existing = shift @existing if @existing;

	foreach (@existing) { $_->delete(); }

	if (defined $value) {

		if ($existing) {

			$existing->value($value);
			$existing->value_text($blob) if $value eq "text";
			$existing->value_date($blob) if $value eq "date";

			if ($value eq "json") {
				my $json = eval{
					return JSON::encode_json($blob);
				};
				$existing->value_text($json);
			}

			$existing->update;

			if ($value eq "delete" || $value eq "" || $value eq "0") {
				$existing->delete;
			}

			return;

		} elsif ($value ne "delete" && $value && $value ne "0") {

			my $existing = Tab::JudgeSetting->create({
				judge => $self->id,
				tag   => $tag,
				value => $value,
			});

			if ($value eq "text") {
				$existing->value_text($blob);
			} elsif ($value eq "date") {
				$existing->value_date($blob);
			} elsif ($value eq "json") {
				my $json = eval{
					return JSON::encode_json($blob);
				};
				$existing->value_text($json);
			}

			$existing->update();
		}

	} else {

		return unless $existing;
		if ($existing->value eq "text") {
			return $existing->value_text
		} elsif ($existing->value eq "date") {
			return $existing->value_date
		} elsif ($existing->value eq "json") {
			return eval {
				return JSON::decode_json($existing->value_text);
			};
		}
		return $existing->value;
	}
}


sub all_settings {

	my $self = shift;
	my %all_settings;
	my $dbh = Tab::DBI->db_Main();

    my $sth = $dbh->prepare("
		select setting.tag, setting.value, setting.value_date, setting.value_text
		from judge_setting setting
		where setting.judge = ?
        order by setting.tag
    ");

    $sth->execute($self->id);

    while( my ($tag, $value, $value_date, $value_text)  = $sth->fetchrow_array() ) {

		if ($value eq "date") {

			my $dt = Tab::DBI::dateparse($value_date);
			$all_settings{$tag} = $dt if $dt;

		} elsif ($value eq "text") {

			$all_settings{$tag} = $value_text;

		} elsif ($value eq "json") {

			$all_settings{$tag} = eval {
				return JSON::decode_json($value_text);
			};

		} else {
			$all_settings{$tag} = $value;
		}
	}
	return %all_settings;
}

