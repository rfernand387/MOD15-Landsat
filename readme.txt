GEE python code to approximate the MODIS MOD15 fAPAR and LAI algorithm using Landsat 8 OLI.

Main code modules are:

1.  Landsat8MOD15.ipynb - python notebook to sample match-ups of MOD15 products, MDO12 biome type, MOD09 reflectance and OLI reflectance output  to .pkl files
2.  MODISLANDSATV0.ipynb - python notebook that reads in the matchups from .pkl files, formats them as panmdas DF, calibrates hierachal RF predictyors and uploads to GEE

There are other previous versions of these modules as well that are not stable.

Richard Fernandes

