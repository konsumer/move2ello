# move2ello

This is a lil facebook-to-ello migration tool that has been useful in my friend circles. The idea is that you can see all your friend's ello usernames that have already used it. You go there, save your ello username, and you & your friends can see each other listed, so you can add each other to ello. It's  a little clunky, but it's very beta, and out before ello has an API. See it running, [here](http://move2ello.herokuapp.com/).

## todo

Here are things I will eventually implement:

*  Unfortunately, facebook won't let an application get your entire friend-list, just the friends that have used the app, but I will look into working around it.
*  in the long-term: maybe multi-migrations! auth with whatever services you like (twitter, facebook, ello, etc) and share the mapping with whover you like (public, "just my twitter friends", "just my fb friends", etc)

## installing your own

You need to setup a new facebook web app and set these environment variables in the app's heroku config:

    MONGOLAB_URI=mongodb://BLAHBLAHBLAH
    FACEBOOK_APP_ID=BLAH
    FACEBOOK_APP_SECRET=BLAHBLAH