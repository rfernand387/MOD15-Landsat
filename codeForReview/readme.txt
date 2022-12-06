This is code for peer review.

There are four modules.

Landsat8MOD15,ipynb - this is a smart scraper that gets matches of Landsat surface reflectance and MODIS LAI, fAPAR and reflectance products through GLOBAL sampling
MODISLandsatdemp.ipynb - this takes output files from Landsat8MOD15.ipynb and makes biome specific hierarchal RF for predicting the LAI or fAPAR that are uploaded to GEE assets ,
                    - there is hard coding for the runs output from Landsat8MOD15.ipynb and for the output asset directory paths that will be deprecated
modisLandst.js - GEE javascript code that creats an algorithms from MANY hierarchical RF in a asset directory and applies is to an Landsat image
