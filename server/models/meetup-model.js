/*
  FILE:      models/meetup-model.js
  OWNER:     reference flow, team-written (built first; the rest of the team copies this pattern).
  PURPOSE:   Mongoose schema and CRUD functions for meetups
  FIELDS:    as the Meetup shape, plus createdAt; members are embedded sub-documents
             Meetup { code, hostName, occasion, date "YYYY-MM-DD", time "HH:MM",
                      members: [ { _id, name, start: { label, postal, lat, lng } | null } ] }
  FUNCTIONS: create, find by code, add member, update a member's start
  REVISE:    Wk 5 blog-model.js (schema + exported CRUD functions)
*/

// STEPS
// Course example paths are relative to ~/Desktop/IS216/

// TODO 1: Require Mongoose.
//         Example: Week 5/server/blog-with-mongodb/models/blog-model.js

// TODO 2: Define a member sub-schema with:
//           - name  (String, required, trimmed)
//           - start (an object { label, postal, lat, lng }, default null)
//         Tip: Mongoose gives every sub-document its own _id; that's the member id the
//         frontend stores.

// TODO 3: Define the meetup schema:
//           - code (String, required, unique)
//           - hostName, occasion, date ("YYYY-MM-DD"), time ("HH:MM"): all Strings, required
//           - members (an array of the member sub-schema)
//           - createdAt (Date, defaults to now)

// TODO 4: Create the model on the meetups collection, the same way blog-model.js creates
//         Blog on blogs.

// TODO 5: Export these CRUD functions in the course style (exports.name = function ...),
//         each returning the Mongoose result:
//           - createMeetup(data)
//           - findByCode(code)
//           - addMember(code, name)
//           - setMemberStart(code, memberId, start)   (this one later)

// TIP: blog-model.js's addBlog uses Blog.find() without await. Don't copy that part.
