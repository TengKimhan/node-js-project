import express from 'express';
import bodyParser from 'body-parser';
import bcrypt from 'bcrypt-nodejs';
import cors from 'cors';
import knex from 'knex';
import { response } from 'express';

// connect with postgres
const postgres = knex({
    client: 'pg',
    connection: {
        host: '127.0.0.1', // local host
        port: 5432,
        user: 'tengkimhan',
        password: '',
        database: 'smart-brain'
    }
});

// query all data from users table
// postgres.select('*').from('users').then(
//     data => {
//         console.log("Database -> ", data);
//     }
// );

const app = express();
app.use(bodyParser.json());
app.use(cors()); // avoid cross origin

// const database = {
//     users: [
//         {
//             id: '1',
//             name: "Teng kimhan",
//             age: 22,
//             email: "tengkimhan@gmail.com",
//             password: "123",
//             hash_password: "$2a$10$QaY/lfw7AjjcFwhZGayHGem7g2f4SRMcsMFhUIuuaB.znhXKe30NG",
//             entries: 0,
//             data_joined: new Date()
//         },
//         {
//             id: '2',
//             name: "Teng kimhan",
//             age: 22,
//             email: "tengkimhan@gmail.com",
//             password: "123",
//             hash_password: "",
//             entries: 0,
//             data_joined: new Date()
//         }
//     ],
// };

// get all users request
app.get('/', (req, res) => {
    postgres.select('*').from('users').then(users => {
        res.json(users);
    })
});

// sign-in request
app.post('/sign-in', (req, res) => {
    const { email, password } = req.body;

    postgres
        .select('*')
        .from('login')
        .where('email', '=', email)
        .then(data => {
            const isValid = bcrypt.compareSync(password, data[0].hash);
            if (isValid) {
                return postgres
                    .select('*')
                    .from('users')
                    .where('email', '=', data[0].email)
                    .then(user => {
                        res.json(user[0])
                    })
                    .catch(err => res.status(400).json("unable to get user"))
            } else {
                res.status(400).json('wrong credential')
            }
        })
        .catch(err => res.status(400).json('invalid credential'))

    // bcrypt.compare(password, database.users[0].hash_password, function (err, result) {
    //     if (err) {
    //         res.json(err);
    //     }
    //     if (email === database.users[0].email
    //         && result) {
    //         res.json(database.users[0]);
    //     } else {
    //         res.status(404).json("Not Found!");
    //     }
    // })
});

// register request
app.post("/sign-up", (req, res) => {

    const { name, email, password } = req.body; // data from request body
    const hash = bcrypt.hashSync(password);

    // use transaction
    postgres
        .transaction(trx => {
            trx
                .insert({
                    hash: hash,
                    email: email
                })
                .into('login')
                .returning('email')
                .then(loginEmail => {
                    console.log(loginEmail[0].email);
                    return trx('users')
                        .returning('*')
                        .insert({
                            name: name,
                            email: loginEmail[0].email,
                            date_joined: new Date()
                        })
                        .then(user => {
                            console.log(user);
                            res.json(user)
                        })
                })
                .then(trx.commit)
                .catch(trx.rollback)
        })
        .catch(err => res.status(400).json("unable to register"))


    // insert data to users table
    // postgres('users')
    //     .returning('*') // returing all column
    //     .insert({
    //         name: name,
    //         email: email,
    //         date_joined: new Date()
    //     })
    //     .then(user => res.json(user))
    //     .catch(err => res.status(400).json('unable to register'));

    // response to server
    // res.json(database.users[0]);

    // bcrypt.hash(password, null, null, function (err, hash) {
    //     // Store hash in your password DB.
    //     if (err) {
    //         res.json(err);
    //     }
    //     database.users.push({
    //         id: id,
    //         name: name,
    //         email: email,
    //         password: password,
    //         hash_password: hash,
    //         entries: 0,
    //         data_joined: new Date()
    //     });
    //     res.json(database.users[database.users.length - 1]);
    // });
});

// get profile by id request
app.get("/profile/:id", (req, res) => {
    const { id } = req.params;

    postgres.select('*')
        .from('users')
        .where({
            id: id
        })
        .then(user => {
            if (user.length) res.json(user)
            else res.status(400).json("Not found")
        }).catch(err => res.status(400).json("cannot getting user"));

    // let found = false;
    // database.users.forEach(user => {
    //     if (user.id === id) {
    //         found = true;
    //         return res.json(user);
    //     }
    // })
    // if (!found) {
    //     res.status(400).json("Not Found");
    // }
});

// put image request
app.put("/image", (req, res) => {
    const { id } = req.body;

    postgres('users')
        .where('id', '=', id)
        .increment('entries', 1)
        .returning('entries')
        .then(entries => {
            res.json(entries[0].entries);
        }).catch(err => res.status(400).json("unable to update entries"));

    // let found = false;
    // database.users.forEach(user => {
    //     if (user.id === id) {
    //         found = true;
    //         user.entries++;
    //         return res.json(user);
    //     }
    // })
    // if (!found) {
    //     res.status(400).json("Not Found");
    // }
})

app.listen(8080, () => {
    console.log("App is running on port 8080");
});