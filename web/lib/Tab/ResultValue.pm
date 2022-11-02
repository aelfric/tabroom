package Tab::ResultValue;
use base 'Tab::DBI';
Tab::ResultValue->table('result_value');
Tab::ResultValue->columns(Primary => qw/id/);
Tab::ResultValue->columns(Essential => qw/priority value result result_key protocol/);
Tab::ResultValue->columns(Others => qw/timestamp/);

Tab::ResultValue->has_a(result => 'Tab::Result');
Tab::ResultValue->has_a(result_key => 'Tab::ResultKey');
Tab::ResultValue->has_a(protocol => 'Tab::Protocol');

__PACKAGE__->_register_datetimes( qw/timestamp/);
