//demo that applies a heirarchical RF for one bi0ome type to a landsat image
// we could map this over all biome types if we had a biome band in the image ...

// gets the unique calues in an image band approximately
function uniqueValues(image) {

var reduction = image.reduceRegion({reducer:ee.Reducer.frequencyHistogram(), geometry: image.geometry(),bestEffort : true});
 
// Remove all the unnecessary reducer output structure and make a list of values.
var values = ee.Dictionary(reduction.get(image.bandNames().get(0)))
    .keys()
    .map(ee.Number.parse);
return values
}

// parses a feature collection ot a classifier]
function fc_to_classifier(fc) {

var tree_strings = fc.aggregate_array("tree").map(function (x) { return ee.String(x).replace("#", "\n", "g") } )  // expects that # is ecoded to be a return


// # pass list of ee.Strings to an ensemble decision tree classifier (i.e. RandomForest)
return classifier = ee.Classifier.decisionTreeEnsemble(tree_strings)

}

//creates an image where each band is te numerical value from a list of strings
function stringListtoImage(stringList) {
  
  // convert strigs to number and zip it to a dictionry
  var numList = ee.List(stringList).map( function (x) { return ee.Number.parse(x)})
  var indexList = ee.List.sequence(1,numList.size()).map( function (x) { return ee.Number(x).format('%d')})

  // create an image collection and flatten in correct order
  return ee.Dictionary.fromLists(indexList,numList).toImage(indexList)
}


// Applies a RF and returns response
function predictRF(image,methodFC) {
  var image = ee.Image(image)
  var methodFC = ee.FeatureCollection(methodFC)
  
  // select inputs scale the image and rename to RF regressors
  var params = methodFC.first()
  return image.select(ee.String(params.get('regressorsGENames')).split(','))
                .multiply(stringListtoImage(ee.String(params.get('regressorsGEScaling')).split(',')))
                .add(stringListtoImage(ee.String(params.get('regressorsGEOffset')).split(',')))
                .multiply(stringListtoImage(ee.String('10000,10000,1,1,1,1').split(',')))
                .rename(ee.String(params.get('regressors')).split(','))
                .round()
                .classify(methodFC.get('RF'))
}

//applies a child RF to data under a mask
function applyChildRF(image,methodFC,childName) {
  var image = ee.Image(image)
  var methodFC = ee.List(methodFC)
  var childName = ee.Number(childName)

  image=image.updateMask(image.select('childNames').eq(childName))
  return predictRF(image,methodFC.filter(ee.Filter.stringContains('system:id',childName.format("%d"))).get(0))
                 .multiply(1000)
                 .toInt16()
                .rename('estimate')

}

// apply algorithm
function estimateResponse(method,image) {
  var method = ee.FeatureCollection(method)
  var image = ee.Image(image)

                
  // make a band indicating children Numbers based on the parent RT             
  image = image.addBands(predictRF(image,method).multiply(1000).round().rename('childNames'))
  
  // make images of response for each unique childnumbers
  return uniqueValues(image.select('childNames')).map( applyChildRF.bind(null,image,method.get('childFCList')))

}

// apply algorithm
function estimateChildren(method,image) {
  var method = ee.FeatureCollection(method)
  var image = ee.Image(image)

  // make a band indicating children Numbers based on the parent RT             
  return image.addBands(predictRF(image,method).multiply(1000).round().rename('childNames'))

}

// construct method
function constructMethod(methodName,directoryName) {
  var methodName = String(methodName)
  var directoryName = String(directoryName)
  
  var assetList = ee.FeatureCollection(ee.List(ee.data.listAssets(directoryName)['assets']
                    .map(function(d) { return ee.FeatureCollection(d.name) })))
  assetList = assetList.toList(assetList.size())
  print('All assets:',assetList)

  // create algorithm
  var parentList = assetList.filter(ee.Filter.stringContains('system:id',methodName))
                                                .filter(ee.Filter.stringContains('system:id','parent'))
                          .map(function (parentFC) { return ee.FeatureCollection(parentFC).set('RF',fc_to_classifier(ee.FeatureCollection(parentFC)))})

  var methodList = parentList.map(function (parentFC) { return ee.FeatureCollection(parentFC).set('childFCList',assetList.filter(ee.Filter.stringContains('system:id',ee.String(ee.FeatureCollection(parentFC).get('system:id')).slice(0,-8)))
                        .filter(ee.Filter.stringContains('system:id','child'))
                        .map(function (childFC) { return ee.FeatureCollection(childFC).set('RF',fc_to_classifier(ee.FeatureCollection(childFC)))}))})


  print('All parents and children:',methodList)
  return methodList
  
}  

// mai part of fn
var palettes = require('users/gena/packages:palettes');
var palette = palettes.misc.gnuplot[7]

var path = 15
var row = 30
var year = 2015
var month = 6
var daystart =  01
var deltaDay= 100
var cloudCoverL0X = 20
var collectionLandsatL1c = "LANDSAT/LC08/C02/T1_TOA"
var collectionLandsatL2a = "LANDSAT/LC08/C02/T1_L2"
var imageLC = ee.ImageCollection(collectionLandsatL2a)
                                .filterMetadata('WRS_PATH','equals',path)
                                .filterMetadata('WRS_ROW','equals',row)
                                .filterDate(ee.Date.fromYMD(year,month,daystart),ee.Date.fromYMD(year,month,daystart).advance(deltaDay,'days')) 
                                .filter(ee.Filter.lte('CLOUD_COVER_LAND',cloudCoverL0X))
                                .first()

imageLC = imageLC.addBands(ee.ImageCollection(collectionLandsatL1c)
                              .filterMetadata('system:index','equals',imageLC.get('system:index')) 
                              .first() 
                              .select(['VZA','VAA','SZA','SAA'])) 


//  apply bime 1 RF only for demo
var methodName = "NAIVE"
var treeDirectory = "users/rfernand387/modisLandsatTrees/"
var method = constructMethod(methodName,treeDirectory)
var resultImage = estimateResponse(method.get(0),imageLC)

print(resultImage)
print(imageLC)
Map.centerObject(imageLC )
Map.addLayer(imageLC)

Map.addLayer(ee.ImageCollection(estimateChildren(method.get(0),imageLC)))
Map.addLayer(ee.ImageCollection(resultImage).mosaic())
