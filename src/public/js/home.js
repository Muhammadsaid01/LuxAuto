console.log("Home frontend javascript file");

/**
 * Three.js Sphere Animation
 * Powered by Three.js r68 & GSAP (TweenMax)
 */

var Spheres = {};
var local = Spheres;

local.wHalfX = window.innerWidth / 2;
local.wHalfY = window.innerHeight / 2;
local.rangeFact = 1;
local.mouseX = 0;
local.mouseY = 0;
local.materials = [];
local.matColors = [];
local.geometries = [];
local.particleSystems = [];
local.particleRotations = [];
local.particleGroupVelocity = [];
local.particleTweens = [];

// Dumby koordinatalar (Sharlar markazlashishi uchun)
local.markers = [
    {"id":"313","lat":"42.4882","lng":"-71.5871"}, {"id":"314","lat":"40.0107","lng":"-75.2363"}, 
    {"id":"315","lat":"39.5717","lng":"-104.987"}, {"id":"316","lat":"37.6489","lng":"-122.214"}, 
    {"id":"317","lat":"-32.3244","lng":"-56.999"}, {"id":"318","lat":"28.2269","lng":"30.1885"}, 
    {"id":"319","lat":"52.643","lng":"-2.15524"}, {"id":"320","lat":"23.2816","lng":"113.553"}, 
    {"id":"321","lat":"31.2784","lng":"121.155"}, {"id":"322","lat":"-30.0692","lng":"150.862"}, 
    {"id":"323","lat":"-30.373","lng":"143.393"}, {"id":"324","lat":"7.44947","lng":"165.19"}, 
    {"id":"325","lat":"58.8591","lng":"72.3777"}, {"id":"326","lat":"14.6897","lng":"5.58085"}, 
    {"id":"327","lat":"-27.9169","lng":"34.7605"}
];

local.init = function() { 
    local.container = document.createElement( 'div' );
    local.container.style.position = 'fixed';
    local.container.style.top = '0';
    local.container.style.left = '0';
    local.container.style.zIndex = '1'; // CSS bilan moslashish uchun
    document.body.appendChild( local.container );

    local.camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 2, 10000 );
    local.camera.position.z = 3100;

    local.scene = new THREE.Scene();
    local.scene.fog = new THREE.FogExp2( 0x09397c, 0.00006 ); 

    local.spinValues = {x:0, y:0, z:0, camDist:local.camera.position.z};
    local.setSpinning();
    local.generateLinesSystem(1000, 200);

    var limit = 7;
    for (var i=0; i<limit; ++i) {
        local.generateParticleSystem(400+100*i, 350+Math.random()*100+20*(i*i+1), Math.random()*10+15); 
    }

    local.renderer = new THREE.WebGLRenderer( { clearAlpha: 1, antialias:true, alpha: true} );
    local.renderer.setSize( window.innerWidth, window.innerHeight );
    local.renderer.autoClear = false;
    local.container.appendChild( local.renderer.domElement );

    TweenMax.to(local, 6, {rangeFact:1.2, yoyo:true, repeat:-1, ease:Quad.easeInOut});

    $(document).on('mousemove', local.onDocumentMouseMove);
    $(document).on('mousewheel', local.onDocumentMouseWheel);
    $(window).on('resize', local.onWindowResize);
};

local.generateParticleGeometry = function(nodes, range) {
    var geometry = new THREE.Geometry();
    var systemID = local.particleSystems.length-1;
    var tweenArr = [];
    local.particleGroupVelocity.push(Math.random()*6+0.2);
    local.particleTweens[systemID] = tweenArr;

    for (var i = 0; i < nodes; i++ ) {
        var vertex = new THREE.Vector3();  
        var node = i % local.markers.length;
        
        var initTheta = Math.random() * 2 * Math.PI;
        var initPhi = Math.random() * Math.PI;
        var theta = local.markers[node].lat;
        var phi = local.markers[node].lng;      
        
        theta = (90 + parseFloat(theta)) * Math.PI / 180;
        phi = -(parseFloat(phi)) * Math.PI / 180;
        
        vertex.x = range * Math.sin(initTheta) * Math.cos(initPhi);  
        vertex.y = range * Math.sin(initTheta) * Math.sin(initPhi); 
        vertex.z = range * Math.cos(initTheta); 

        geometry.vertices.push( vertex );

        var tartheta = theta + Math.sin(i) * 2 * Math.PI / 180;
        var tarphi = phi + Math.cos(i) * Math.PI / 180;
        var tarX = range * Math.sin(tartheta) * Math.cos(tarphi);
        var tarY = range * Math.sin(tartheta) * Math.sin(tarphi);   
        var tarZ = range * Math.cos(tartheta); 
        
        var tween = TweenMax.to(vertex, 1, {
            x: tarX, y: tarY, z: tarZ,
            ease: Linear.easeNone,
            delay: i / nodes * 4,
            onComplete: local.moveGeomVertex,
            onCompleteParams: [systemID, i, vertex, tartheta, tarphi, range]
        });
        tweenArr.push(tween);
    }
    local.geometries.push(geometry);
    return geometry;
};

local.moveGeomVertex = function(systemID, i, vertex, theta, phi, range) {
    if (!local.particleTweens[systemID] || !local.particleTweens[systemID][i]) return;
    
    var distFact = local.particleGroupVelocity[systemID];
    var tartheta = theta + Math.sin(i % local.markers.length) * distFact * 2 * Math.PI / 180;
    var tarphi = phi + Math.cos(i % local.markers.length) * distFact * Math.PI / 180;
    
    var tarX = range * local.rangeFact * Math.sin(tartheta) * Math.cos(tarphi);
    var tarY = range * local.rangeFact * Math.sin(tartheta) * Math.sin(tarphi);   
    var tarZ = range * local.rangeFact * Math.cos(tartheta);  

    var tween = local.particleTweens[systemID][i];
    tween.updateTo({
        x: tarX, y: tarY, z: tarZ, 
        delay: 0, 
        onCompleteParams: [systemID, i, vertex, tartheta, tarphi, range]
    }, true); 
};

local.generateParticleMaterial = function(pSize) {
    var material = new THREE.ParticleSystemMaterial({
        color: '#'+Math.floor(Math.random()*16777215).toString(16),
        size: pSize, 
        blending: THREE.AdditiveBlending,
        transparent: true
    });
    local.materials.push(material);
    local.matColors.push({h:Math.random()*0.6+0.2, s:Math.random(), l:Math.random()*0.6+0.2});
    var num = local.matColors.length-1;
    TweenMax.to(local.matColors[num], Math.random()+1, {
        h:Math.random()*0.6+0.2, s:Math.random(), l:Math.random()*0.6+0.2, 
        onUpdate:local.updateMaterialColor, onUpdateParams:[num], repeat:-1, yoyo:true
    }); 
    return material;
};

local.generateLineGeometry = function(nodes, range) {
    var geometry = new THREE.Geometry();
    for (var i = 0; i < nodes; i++ ) {
        var vertex = new THREE.Vector3();   
        var phi = (Math.cos(i/50)*180) + Math.random(); 
        var theta = (Math.tan(i/500)*180) + Math.random();
        theta = (90+theta)*Math.PI/180;
        phi = -(phi)*Math.PI/180;
        
        vertex.x = range * Math.sin(theta)*Math.cos(phi);  
        vertex.y = range * Math.sin(theta)*Math.sin(phi);    
        vertex.z = range * Math.cos(theta);
        geometry.vertices.push( vertex );
    }
    local.geometries.push(geometry);
    return geometry;
};

local.generateLineMaterial = function() {
    var material = new THREE.LineBasicMaterial({
        color: '#'+Math.floor(Math.random()*16777215).toString(16), 
        blending: THREE.AdditiveBlending,
        transparent: true
    });
    local.materials.push(material);
    local.matColors.push({h:Math.random()*0.2+0.8, s:Math.random(), l:Math.random()*0.2+0.8});
    var num = local.matColors.length-1;
    TweenMax.to(local.matColors[num], Math.random()+2, {
        h:Math.random()*0.2+0.8, s:Math.random(), l:Math.random()*0.2+0.8, 
        onUpdate:local.updateMaterialColor, onUpdateParams:[num], repeat:-1, yoyo:true
    });
    return material;
};

local.updateMaterialColor = function(item) {
    var color = local.matColors[item];
    local.materials[item].color.setHSL( color.h, color.s, color.l );
};

local.generateLinesSystem = function(nodes, range) {
    local.particleRotations.push({x:(Math.random()>0.5)?-1:1, y:(Math.random()>0.5)?-1:1});
    var mat = local.generateLineMaterial();
    var geom = local.generateLineGeometry(nodes, range);
    var lines = new THREE.Line( geom, mat );
    local.scene.add(lines);
    local.particleSystems.push(lines);
};

local.generateParticleSystem = function(nodes, range, pSize) {
    local.particleRotations.push({x:(Math.random()>0.5)?-1:1, y:(Math.random()>0.5)?-1:1});
    var mat = local.generateParticleMaterial(pSize);
    var geom = local.generateParticleGeometry(nodes, range);
    var particles = new THREE.ParticleSystem( geom, mat );  
    particles.sortParticles = true;
    local.scene.add(particles);
    local.particleSystems.push(particles);
};

local.render = function() {
    local.camera.position.x += ( local.mouseX - local.camera.position.x ) * 0.05;
    local.camera.position.y += ( -local.mouseY - local.camera.position.y ) * 0.05;
    local.camera.lookAt( local.scene.position );
    local.renderer.render( local.scene, local.camera );
    local.renderer.clear(false, true, false);
};

local.onDocumentMouseWheel = function(evt) {
    var d = evt.originalEvent.wheelDelta * 10;
    TweenMax.to(local.camera.position, 1, {z: '-=' + d});
};

local.onDocumentMouseMove = function(evt) {
    local.mouseX = (evt.clientX - local.wHalfX) * 0.5;
    local.mouseY = (evt.clientY - local.wHalfY) * 0.5;
    for (var i=0; i<local.particleSystems.length; ++i) {
        TweenMax.to(local.particleSystems[i].rotation, 1, {
            y: (i+1) * local.mouseX/180*Math.PI, 
            x: (i+1) * local.mouseY/180*Math.PI
        });
    }
};

local.setSpinning = function() {
    TweenMax.to(local.spinValues, 10, {
        x: '+=' + (Math.random()*6-3),
        y: '+=' + (Math.random()*6-3),
        z: '+=' + (Math.random()*6-3),
        onComplete: local.setSpinning,
        ease: Quad.easeInOut
    });
};

local.onWindowResize = function() {
    local.wHalfX = window.innerWidth / 2;
    local.wHalfY = window.innerHeight / 2;
    local.camera.aspect = window.innerWidth / window.innerHeight;
    local.camera.updateProjectionMatrix();
    local.renderer.setSize( window.innerWidth, window.innerHeight );
};

local.animate = function() {
    requestAnimationFrame( local.animate );
    local.render();
};

$(document).ready(function() {
    local.init();
    local.animate();
});