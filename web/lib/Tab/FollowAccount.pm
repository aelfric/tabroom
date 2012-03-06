package Tab::FollowEntry;
use base 'Tab::DBI';
Tab::FollowEntry->table('follow_entry');
Tab::FollowEntry->columns(Primary => qw/id/);
Tab::FollowEntry->columns(Essential => qw/entry cell email domain/);
Tab::FollowEntry->has_a(entry => 'Tab::Entry');

