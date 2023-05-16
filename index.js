const express = require('express');
const app = express();
const http = require('http');
const https = require('https');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');

app.use(cookieParser());

require('./database');

const PORT = 3000;

app.use(express.json());

const beersSchema = new mongoose.Schema({
    id: {type: Number, required: true, unique: true},
    brand: {type: String, required: true},
    name: {type: String, required: true},
    style: {type: String, required: true},
    hop: {type: String, required: true},
    yeast: {type: String, required: true},
    malts: {type: String, required: true},
    ibu: {type: Number, required: true},
    alcohol: {type: Number, required: true},
    blg: {type: String, required: true},
});

const Beers = mongoose.model('Beers', beersSchema);

const getNewBeer = (url) => {
    return new Promise ((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve(JSON.parse(data));
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
};

const saveBeer = async (data) => {
    try{
        for (let i = 0; i < data.length; i++) {
            const beerData = data[i];
            const ibuString = beerData.ibu;
            const alcoholString = beerData.alcohol;

            const ibuNumber = parseInt(ibuString.split(' ')[0]);
            const alcoholNumber = parseFloat(alcoholString.split('%')[0]).toFixed(1);

            const beer = new Beers({
                id: beerData.id,
                brand: beerData.brand,
                name: beerData.name,
                style: beerData.style,
                hop: beerData.hop,
                yeast: beerData.yeast,
                malts: beerData.malts,
                ibu: ibuNumber,
                alcohol: alcoholNumber,
                blg: beerData.blg,
            });

            await beer.save();
        }
    } catch (err) {
        console.log(err);
    }
};

app.get('/new-beers', async (req, res) => {
    try{
        const url = 'https://random-data-api.com/api/v2/beers';
        const beers = [];
        const numberBeers = req.query.number;
        const limit = numberBeers ? numberBeers : 3;

        for (let i = 0; i < limit; i++) {
            const newBeers = await getNewBeer(url);
            beers.push(newBeers);
        }

        res.send(beers);
        await saveBeer(beers);

    } catch (err) {
        console.log(err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/saved-beers', async (req, res) => {
    const beerId = req.query.id;
    if (beerId){
        try {
            const beer = await Beers.find({id: beerId});
            if (Object.keys(beer).length !== 0){
                res.send(beer);
            }else{
                res.status(404).send('Beer not found');
            }
        } catch (err) {
            console.log(err);
            res.status(500).send('Internal Server Error');
        }
    } else {
        try {
            const beers = await Beers.find();
            res.send(beers);
        } catch (err) {
            console.log(err);
            res.status(500).send('Internal Server Error');
        }
    }
});

app.get('/beers-by-style', async (req, res) => {
    try {
        const filterStyle = req.query.style || req.cookies.lastStyle || null;
        const filter = filterStyle ? {style: filterStyle} : {};
        if (filterStyle){
            res.cookie('lastStyle', filterStyle);
        }
        const beers = await Beers.find(filter);
        if (Object.keys(beers).length !== 0){
            res.send(beers);
        }else{
            res.status(404).send('not beers found within that style');
        }
    } catch (error) {
        res.status(500).send({error: error.message});
    }
});

app.get('/beers-by-brand', async (req, res) => {
    try {
        const filterBrand = req.query.brand || req.cookies.lastBrand || null;
        const filter = filterBrand ? {brand: filterBrand} : {};
        if (filterBrand){
            res.cookie('lastBrand', filterBrand);
        }
        const beers = await Beers.find(filter);
        if (Object.keys(beers).length !== 0){
            res.send(beers);
        }else{
            res.status(404).send('not beers found of that brand');
        }
    } catch (error) {
        res.status(500).send({error: error.message});
    }
});

app.get('/beers-alcohol-upperlimit', async (req, res) => {
    try {
        const filterUperLimit = req.query.limit || req.cookies.lastLimit || null;
        const filter = filterUperLimit ? filterUperLimit : 0;
        if (filterUperLimit){
            res.cookie('lastLimit', filterUperLimit);
        }
        const beers = await Beers.where('alcohol').lte(filter);
        if (Object.keys(beers).length !== 0){
            res.send(beers);
        }else{
            res.status(404).send(`not beers found with alcohol lower than ${filterUperLimit}`);
        }
    } catch (error) {
        res.status(500).send({error: error.message});
    }
});

app.get('/beers-alcohol-lowerlimit', async (req, res) => {
    try {
        const filterLowerLimit = req.query.limit || req.cookies.lastLimit || null;
        const filter = filterLowerLimit ? filterLowerLimit : 0;
        if (filterLowerLimit){
            res.cookie('lastLimit', filterLowerLimit);
        }
        const beers = await Beers.where('alcohol').gte(filter);
        if (Object.keys(beers).length !== 0){
            res.send(beers);
        }else{
            res.status(404).send(`not beers found with alcohol higher than ${filterLowerLimit}`);
        }
    } catch (error) {
        res.status(500).send({error: error.message});
    }
})

app.post('/saved-beers', async (req, res) => {
    try {
        const beer = new Beers(req.body);
        await beer.save();
        res.status(201).send(beer);
    } catch (error) {
        res.status(400).send({error: error.message});
    }
})

app.put('/saved-beers/:id', async (req, res) => {
    try {
        const beer = await Beers.findOneAndUpdate({id: req.params.id}, req.body);
        if (!beer) {
            return res.status(404).send({error: 'Beer not found'});
        }
        res.send(beer);
    } catch (error) {
        res.status(500).send({error: error.message});
    }
});

app.delete('/saved-beers/:id', async (req, res) => {
    try {
        const beer = await Beers.findOneAndDelete({id: req.params.id});
        if (!beer) {
            return res.status(404).send({error: 'Beer not found'});
        }
        res.send(beer);
    } catch (error) {
        res.status(500).send({error: error.message});
    }
});

app.listen(PORT, () => {
     console.log(`Listening on port ${PORT}`)
})
