# ER Diagram

users

id

name

email

role



visitors

id

name

phone

nrc

company



visits

id

visitor_id

host_name

purpose

checkin_at

checkout_at

status

qr_token



audit_logs

id

user_id

action

table_name

record_id

created_at


Relationships

users

↓

audit_logs


visitors

↓

visits
